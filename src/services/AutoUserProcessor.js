import apiService from "./apiService";
import { db } from "../database/db";
import { getSingleToken, getNameBanList, getConfirmUSTime, getBioBanList } from "../utils/storageManager";

class AutoUserProcessor {
    constructor() {
        this.isRunning = false;
        this.isFindingEmail = false;
        this.intervalId = null;
        this.retryIntervals = new Map(); // Track retry intervals for failed users
        this.processingUser = null;
        this.checkInterval = 3000; // Check for new pending users every 3 seconds
        this.maxRepoCheck = 30;
        this.maxRepoCheckForTimes = 5;
        this.minCommitCheck = 10;
        this.usEstimateScoreThreshold = 0.9;
        this.usEstimateScoreThreshold = 0.6;
        this.commonDomains = [
            // Personal / consumer
            '@gmail.com',
            '@yahoo.com',
            '@outlook.com',
            '@hotmail.com',
            '@aol.com',
            '@icloud.com',
            '@me.com',
            '@mac.com',
            '@live.com',

            // Secure / professional personal
            '@zoho.com',
            '@mail.com',
            '@gmx.com',
            '.gov'
        ];
    }

    estimateUSBased(repositoryCommitTimes) {
        // Continental US timezones in UTC (approximate)
        // Eastern -5, Central -6, Mountain -7, Pacific -8
        const usOffsets = [-5, -6, -7, -8];

        const repositoryScores = [];
        let totalValidTimes = 0;
        let totalCommitTimes = 0;

        // Process each repository
        repositoryCommitTimes.forEach((commitTimes, index) => {
            const validTimes = commitTimes.filter(ts => {
                const date = new Date(ts);
                const utcHour = date.getUTCHours();

                // Check if this hour falls within any US timezone working hours
                return usOffsets.some(offset => {
                    // Convert UTC to local time in each timezone
                    const localHour = (utcHour + offset + 24) % 24;
                    // Assuming working hours 8 AM to 10 PM (22:00)
                    return localHour >= 7 && localHour <= 22;
                });
            });

            // Calculate score for this repository
            const repoScore = commitTimes.length ? validTimes.length / commitTimes.length : 0;
            repositoryScores.push(repoScore);

            // Accumulate for total score calculation
            totalValidTimes += validTimes.length;
            totalCommitTimes += commitTimes.length;

            // console.log(`Repository ${index}: ${validTimes.length}/${commitTimes.length} valid commits (${(repoScore * 100).toFixed(1)}%)`);
        });

        // Calculate overall score
        const totalScore = repositoryScores.length ? repositoryScores.reduce((a, b) => a + b, 0) / repositoryScores.length : 0;
        const secondScore = repositoryScores.length ? repositoryScores.filter(s => s >= this.usEstimateScoreThreshold).length / repositoryScores.length : 0;

        // console.log("\tRepository scores:", repositoryScores);

        return {
            repositoryScores: repositoryScores,
            totalScore: totalScore,
            totalValidTimes: totalValidTimes,
            totalCommitTimes: totalCommitTimes,
            isUS: totalScore >= this.usEstimateScoreThreshold || secondScore >= this.usEstimateScoreThreshold2,
            repositoryCommitTimes: repositoryCommitTimes,
            usEstimateEnoughCommits: repositoryCommitTimes.length > 0
        };
    }

    // GitHub API integration - fetch all user information
    async fetchGitHubUserInfo(identifier) {
        try {
            // Check if identifier is a username or ID
            const isId = false;//   /^\d+$/.test(identifier.toString());
            const endpoint = isId
                ? `https://api.github.com/user/${identifier}`
                : `https://api.github.com/users/${identifier}`;

            // Fetch basic user info
            const userResponse = await fetch(endpoint, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    // Add GitHub token if available for higher rate limits
                    ...(getSingleToken() && {
                        'Authorization': `token ${getSingleToken()}`
                    })
                }
            });

            if (!userResponse.ok) {
                throw new Error(`GitHub API error: ${userResponse.status}`);
            }

            const userData = await userResponse.json();
            var resData = {
                // Basic info
                username: userData.login,
                name: userData.name || userData.login || "",
                githubId: userData.id,
                avatarUrl: userData.avatar_url,
                profileUrl: userData.html_url,

                // Stats
                followers: userData.followers,
                following: userData.following,
                repositories: userData.public_repos,

                // Location and bio
                location: userData.location || "",
                bio: userData.bio || "",
                company: userData.company || "",
                blog: userData.blog || "",

                // Account info
                since: userData.created_at ? new Date(userData.created_at).getFullYear().toString() : null,
                lastActive: userData.updated_at,

                // Contact information
                emails: [], // Remove duplicates

                // Ban
                isNameBan: false,
                isBioBan: false,
                usEstimate: false
            };

            // check if name is ban
            const name = resData.name
                .replace("-", " ")                           // replace hyphen with space
                .replace(/[^a-zA-Z\s]/g, "")                  // remove digits and special characters
                .split(/\s+/)                                 // split into words on whitespace
                .map(w => w.charAt(0).toUpperCase() +         // capitalize first letter
                    w.slice(1).toLowerCase())           // lowercase the rest
                .join(" ");                                   // join words back with single spaces

            const nameParts = name.toLowerCase().split(/\s+/);
            const banNames = getNameBanList();

            const isNameBan = nameParts.some(part =>
                banNames.some(pattern => {
                    if (pattern.startsWith("%")) {
                        // treat % as "ends with"
                        return part.endsWith(pattern.slice(1).toLowerCase());
                    }
                    return part === pattern.toLowerCase();
                })
            );

            if (isNameBan) {
                // console.log(resData.name, " - ", name);
                resData.isNameBan = true;
                return resData;
            }

            // check if bio is ban
            const banBios = getBioBanList();
            const isBioBan = banBios.some(n => resData.bio.toLowerCase().includes(n.toLowerCase()));
            if (isBioBan) {
                resData.isBioBan = true;
                return resData;
            }

            // Fetch additional data in parallel
            const [reposResponse] = await Promise.all([
                fetch(`${userData.repos_url}?per_page=100`, {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        ...(getSingleToken() && {
                            'Authorization': `token ${getSingleToken()}`
                        })
                    }
                })
            ]);

            const repos = reposResponse.ok ? await reposResponse.json() : [];

            // console.log(userData, repos);
            // Extract emails from various sources
            let emails = [];
            let times = []; // 2-depth-array

            if (userData.public_repos > 0) {
                const emailsandcommits = await this.extractEmailsAndTimes(userData, repos, getSingleToken());
                emails = emailsandcommits.emails;
                times = emailsandcommits.times;
            }

            const usEstimateResult = this.estimateUSBased(times);
            // console.log("", usEstimateResult);

            resData.usEstimate = usEstimateResult.isUS;
            resData.usEstimateScore = usEstimateResult.totalScore;
            resData.usEstimateEnoughCommits = usEstimateResult.usEstimateEnoughCommits;
            resData.emails = [...new Set(emails)];

            return resData;
        } catch (error) {
            console.error('Error fetching GitHub user info:', error);
            throw error;
        }
    }


    // Extract emails from various GitHub sources
    async extractEmailsAndTimes(userData, repos, token) {
        const emails = []; // Use Set to avoid duplicates
        var userCommitTimes = [];

        const slicedReposForTimes = repos
            .filter(r => r.owner?.login === userData.login && r.size > 0)  // keep only user's own
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)) // newest → oldest
            .slice(0, this.maxRepoCheck);

        // Fetch commits per repo to extract author times
        for (const repo of slicedReposForTimes) {
            try {
                const response = await fetch(
                    `https://api.github.com/repos/${userData.login}/${repo.name}/commits?author=${userData.login}`,
                    {
                        headers: {
                            Authorization: `token ${token}`,
                            Accept: "application/vnd.github+json",
                        },
                    }
                );

                if (!response.ok) {
                    console.warn(`Failed to fetch commits for repo ${repo.name}: ${response.status}`);
                    continue;
                }

                const commits = await response.json();
                // console.log(repo, commits.length);
                // don't need to check all commits
                if (!commits.length)
                    continue;

                const commit = commits[0];
                const commitEmail = commit?.commit?.author?.email;
                // console.log(commitEmail);
                if (commitEmail && this.commonDomains.some(domain => commitEmail.endsWith(domain))) {
                    emails.push(commitEmail);
                }

                const commitTimes = commits.map(c => c.commit?.author?.date)
                if (commitTimes.length > this.minCommitCheck) {
                    userCommitTimes.push(commitTimes);
                }

                if (emails.some(email => email.endsWith("gmail.com")) && userCommitTimes.length >= this.maxRepoCheckForTimes) {
                    break;
                }
            } catch (err) {
                console.error(`Error fetching commits for repo ${repo.name}:`, err);
            }
        }
        return {
            emails: emails.filter(email =>
                this.commonDomains.some(d => email.endsWith(d))
            ),
            times: userCommitTimes
        };
    }


    // Extract additional contact information
    extractContactInfo(userData, repos) {
        const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
        const socials = {};
        let phone = null;

        // Check bio for phone numbers
        if (userData.bio) {
            const phoneMatch = userData.bio.match(phoneRegex);
            if (phoneMatch) {
                phone = phoneMatch[0];
            }
        }

        // Extract social links from bio and blog
        const text = `${userData.bio || ''} ${userData.blog || ''}`;

        // Twitter
        if (userData.twitter_username) {
            socials.twitter = `https://twitter.com/${userData.twitter_username}`;
        }

        // LinkedIn
        const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
        if (linkedinMatch) {
            socials.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;
        }

        // Personal website
        if (userData.blog && userData.blog.startsWith('http')) {
            socials.website = userData.blog;
        }

        return { phone, socials };
    }

    // Extract top programming languages from repositories
    extractTopLanguages(repos) {
        const languages = {};

        repos.forEach(repo => {
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }
        });

        return Object.entries(languages)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([lang, count]) => ({ language: lang, count }));
    }


    // Process a single pending user
    async processPendingUser(user, getUserList, setUserList) {
        this.isFindingEmail = true;
        const githubId = user.githubId;
        // console.log("Processing pending user: ", user);

        try {
            // Fetch comprehensive GitHub information
            const githubInfo = await this.fetchGitHubUserInfo(user.username || user.githubId);
            const checkUSBased = !getConfirmUSTime() || githubInfo.usEstimate || false;
            const isNameBan = githubInfo.isNameBan;
            const isBioBan = githubInfo.isBioBan;
            const isEmailFound = githubInfo.emails.length > 0;
            const usEstimateScore = githubInfo.usEstimateScore;

            // Determine new status based on email availability
            // const isValid = hasEmails && !(isNameBan || githubInfo.followers > getMaxFollowers() || githubInfo.repositories > getMaxRepositories() || +githubInfo.since < getMinSince());
            const isValid = !isNameBan && !isBioBan && isEmailFound && checkUSBased;
            // if (!isValid) {
            //     console.log(githubInfo);
            // }
            const timestamp = new Date().toTimeString().slice(0, 8); // HH:mm:ss
            var reportString = `${timestamp} ${isValid ? "✅" : "🛑"} ${user.username}  `;
            if (isNameBan)
                reportString += " ❌Name"
            else if (isBioBan)
                reportString += " ❌Bio"
            else if (!isEmailFound)
                reportString += " ❌Email"
            else if (isEmailFound && !checkUSBased) {
                reportString += " ❌isUS"
                if (githubInfo.usEstimateEnoughCommits) {
                    reportString += usEstimateScore.toFixed(2);
                } else {
                    reportString += ".none";
                }
            }

            // Prepare update data
            const newStatus = isValid ? 1 : 9; // 1 = confirmed, 9 = archived
            const updateData = {
                name: (githubInfo.name ?? "").replace(/\d+/g, ""),
                phoneNumber: githubInfo.phone ?? "",
                location: githubInfo.location ?? "",
                followers: githubInfo.followers ?? 0,
                repositoryCount: githubInfo.repositories ?? 0,
                joinedAt: githubInfo.since,
                status: newStatus
            };

            if (githubInfo.emails.length) {
                updateData.email = githubInfo.emails?.join(",");
            }

            // console.log("UpdateData : ", updateData);

            // Update via API
            const apiResponse = await apiService.updateGitHubUser(githubId, updateData);
            // console.log("Api Response ", apiResponse, apiResponse.success, apiResponse.status);
            if (apiResponse.success) {
                // Update local database
                await db.myusers.update(githubId, updateData);
                console.log(reportString);

                const userList = getUserList();
                const updatedList = userList.map((user) =>
                    user.githubId === apiResponse.user.githubId ? apiResponse.user : user
                );

                // userList = updatedList;
                this.isFindingEmail = false;
                setUserList(updatedList);

                return { success: true, status: newStatus, emailsFound: githubInfo.emails.length };
            } else {
                this.isFindingEmail = false;
                // console.error(apiResponse);
                throw new Error('API request failed', apiResponse.error);
            }


        } catch (error) {
            this.isFindingEmail = false;
            console.error(`❌ Failed to process user ${user.username}:`, error);

            return { success: false, error: error.message };
        }
    }

    // Main processing loop
    async processUsers(getUserList, setUserList) {
        if (!this.isRunning) return;

        if (this.processingUser) {
            return;
        }

        const userList = await getUserList();
        // Find first pending user that's not currently being processed
        let pendingUser = null;
        for (let i = userList.length - 1; i >= 0; i--) {
            const user = userList[i];
            if (user.status === 0 && !this.retryIntervals.has(user.githubId)) {
                pendingUser = user;
                break; // Stop as soon as we find the last matching user
            }
        }

        // console.log("Found New User To Process , ", pendingUser);
        if (pendingUser) {
            if (this.isFindingEmail) {
                // console.log("Finding email is already in progress ... retry later");
                return;
            } else {
                // console.log("Setting processing user as ", pendingUser.username);
                this.processingUser = pendingUser;
                await this.processPendingUser(pendingUser, getUserList, setUserList);
                await new Promise((resolve) => setTimeout(resolve, 500));

                // console.log("Setting processing user as NULL");
                this.processingUser = null;
            }
        } else {
            // console.log('ℹ️ No pending users to process at this time');
        }
    }

    // Start the auto processor
    start(getUserList, setUserList) {
        if (this.isRunning) {
            // console.log('Auto processor is already running');
            return;
        }

        this.isRunning = true;
        // console.log('🚀 Starting auto user processor...');

        // Run initial processing
        this.processUsers(getUserList, setUserList);

        // Set up periodic checking
        this.intervalId = setInterval(() => {
            this.processUsers(getUserList, setUserList);
        }, this.checkInterval);

        // console.log(`✅ Auto processor started`);
    }

    // Stop the auto processor
    stop() {
        if (!this.isRunning) {
            // console.log('Auto processor is not running');
            return;
        }

        this.isRunning = false;

        // Clear main interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Clear all retry intervals
        this.retryIntervals.forEach((interval, userId) => {
            clearInterval(interval);
        });
        this.retryIntervals.clear();

        this.processingUser = null;

        // console.log('⏹️ Auto processor stopped');
    }

    // Get current status
    getStatus() {
        const response = {
            isRunning: this.isRunning,
            processingUser: this.processingUser,
            pendingRetries: this.retryIntervals.size,
            retryingUsers: Array.from(this.retryIntervals.keys())
        };
        return response;
    }
}

// Create singleton instance
const autoUserProcessor = new AutoUserProcessor();

// Export functions for use in components
export const startAutoProcessor = (getUserList, setUserList) => {
    autoUserProcessor.start(getUserList, setUserList);
};

export const stopAutoProcessor = () => {
    autoUserProcessor.stop();
};

export const getProcessorStatus = () => {
    return autoUserProcessor.getStatus();
};

export const processUserManually = async (user, getUserList, setUserList) => {
    return await autoUserProcessor.processPendingUser(user, getUserList, setUserList);
};

export default autoUserProcessor;