import { getSingleToken, getMaxRepositories, getMaxFollowers, getMinRepositories, getMinFollowers, getMinSince, getMaxSince } from "../utils/storageManager";

// Enhanced GitHub User Fetcher with Token Cycling
class GitHubUserFetcher {
  constructor() {
    this.ignoreFirst1000 = sessionStorage.getItem("ignoreFirst1000") === "true";
    this.currentTokenIndex = 0;
    this.baseUrl = 'https://api.github.com/search/users';
    this.maxResults = 1000; // GitHub's limit per search
    // this.maxTotal = 5000; // Our threshold for using splitting algorithm

    // Repository count ranges for splitting
    this.repoRanges = [
      { min: 0, max: 0 },     // repos:1
      { min: 1, max: 1 },     // repos:1
      { min: 2, max: 2 },     // repos:2
      { min: 3, max: 3 },     // repos:3
      { min: 4, max: 4 },     // repos:4..5
      { min: 5, max: 5 },     // repos:4..5
      { min: 6, max: 6 },     // repos:6..7
      { min: 7, max: 7 },     // repos:6..7
      { min: 8, max: 8 },     // repos:8..8
      { min: 9, max: 9 },     // repos:9..9
      { min: 10, max: 12 },   // repos:10..12
      { min: 13, max: 15 },   // repos:13..15
      { min: 16, max: 19 },   // repos:16..19
      { min: 20, max: 23 },   // repos:20..23
      { min: 24, max: 28 },   // repos:24..28
      { min: 29, max: 34 },   // repos:29..34
      { min: 35, max: 39 },   // repos:35..39
      { min: 40, max: 49 },   // repos:40..49
      { min: 50, max: 80 }  // repos:>=50
    ];

    this.followerRange = [
      { min: 0, max: 0 },     // repos:1
      { min: 1, max: 1 },     // repos:1
      { min: 2, max: 2 },     // repos:2
      { min: 3, max: 3 },     // repos:3
      { min: 4, max: 4 },     // repos:4..5
      { min: 5, max: 5 },     // repos:4..5
      { min: 6, max: 6 },     // repos:6..7
      { min: 7, max: 7 },     // repos:6..7
      { min: 8, max: 8 },     // repos:8..8
      { min: 9, max: 9 },     // repos:9..9
      { min: 10, max: 12 },   // repos:10..12
      { min: 13, max: 15 },   // repos:13..15
      { min: 16, max: 19 },   // repos:16..19
      { min: 20, max: 23 },   // repos:20..23
      { min: 24, max: 28 },   // repos:24..28
      { min: 29, max: 34 },   // repos:29..34
      { min: 35, max: 39 },   // repos:35..39
      { min: 40, max: 49 },   // repos:40..49
      { min: 50, max: 59 },
      { min: 60, max: 69 },
      { min: 70, max: 79 },
      { min: 80, max: 89 },
      { min: 90, max: 99 },
    ];


    this.yearRange = [
      { start: "2011-01-01", end: "2011-12-31" },        // (~, 2012)
      { start: "2012-01-01", end: "2012-12-31" },
      { start: "2013-01-01", end: "2013-12-31" },
      { start: "2014-01-01", end: "2014-12-31" },
      { start: "2015-01-01", end: "2015-12-31" },
      { start: "2016-01-01", end: "2016-12-31" },
      { start: "2017-01-01", end: "2017-12-31" },
      { start: "2018-01-01", end: "2018-12-31" },
      { start: "2019-01-01", end: "2019-12-31" },
      { start: "2020-01-01", end: "2020-12-31" },
      { start: "2021-01-01", end: "2021-12-31" },
      { start: "2022-01-01", end: "2022-12-31" },
      { start: "2023-01-01", end: "2023-12-31" },
      { start: "2024-01-01", end: "2024-12-31" },
      { start: "2025-01-01", end: "2030-12-31" }         // (2025~)
    ];
  }

  // Build base query string - returns array of queries for multiple locations
  buildBaseQueries(filters) {
    // console.log(filters);

    // Handle multiple locations
    const locations = filters.location
      ? filters.location.split('\n').map(loc => loc.trim()).filter(loc => loc.length > 0)
      : [''];

    return locations.map(location => {
      let query = 'type:user';

      if (filters.username) {
        query += ` "${filters.username}" in:login`;
      }

      if (filters.bio) {
        query += ` "${filters.bio}" in:bio`;
      }

      if (location) {
        query += ` location:"${location}"`;
      }

      if (filters.language) {
        query += ` language:${filters.language}`;
      }

      if (filters.minRepositories || filters.maxRepositories) {
        const min = filters.minRepositories ?? 0;
        const max = filters.maxRepositories ?? 999999;
        query += ` repos:${min}..${max}`;
      }

      if (filters.minFollowers || filters.maxFollowers) {
        const min = filters.minFollowers ?? 0;
        const max = filters.maxFollowers ?? 999999;
        query += ` followers:${min}..${max}`;
      }

      if (filters.minSince || filters.maxSince) {
        const min = filters.minSince || "*";
        const max = filters.maxSince || "*";
        query += ` created:${min}..${max}`;
      }

      return query.trim();
    });
  }

  extractLocationFromQuery(query) {
    const match = query.match(/location:"([^"]*)"/);
    return match ? match[1] : ""; // returns the location or empty string if none
  }

  // Make API request with error handling and token cycling
  async makeRequest(query, page = 1, per_page = 100) {
    const url = `${this.baseUrl}?q=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}`;
    const token = getSingleToken();

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // If rate limited, try with next token
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining === '0') {

          const nextToken = getSingleToken();

          const retryResponse = await fetch(url, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `Bearer ${nextToken}`
            }
          });

          if (!retryResponse.ok) {
            throw new Error(`GitHub API error: ${retryResponse.status} - ${retryResponse.statusText}`);
          }

          return await retryResponse.json();
        }
      }

      throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }

  // Get total count with a test request
  async getTotalCount(baseQuery) {
    const data = await this.makeRequest(baseQuery, 1, 1);
    return data.total_count;
  }

  // Fetch all pages for a specific query
  async fetchAllPages(query) {
    const allUsers = [];
    let page = 1;
    let hasMore = true;

    // console.log(`Q ${query}`);
    if (query == null) {
      return allUsers;
    }

    while (hasMore && allUsers.length < this.maxResults) {
      const data = await this.makeRequest(query, page);

      if (data.items && data.items.length > 0) {
        allUsers.push(...data.items);

        // Check if we have more pages and haven't hit the limit
        hasMore = data.items.length === 100 && allUsers.length < this.maxResults;
        page++;
      } else {
        hasMore = false;
      }

      // console.log("Total Fetched : ", allUsers.length);
      // Respect rate limits
      // await this.delay(100);
    }

    return allUsers;
  }


  updateYearQuery(baseQuery, range) {
    // read min/max from localStorage functions
    let minSince = getMinSince() || '2000-01-01';
    let maxSince = getMaxSince() || new Date().toISOString().split('T')[0]; // today

    if (/^\d{4}$/.test(minSince)) {
      minSince = `${minSince}-01-01`;
    }
    if (/^\d{4}$/.test(maxSince)) {
      maxSince = `${maxSince}-12-31`;
    }

    // use correct keys from range
    let start = range.start || minSince;
    let end = range.end || maxSince;

    // convert to Date objects for safe comparison
    let startDate = new Date(start);
    let endDate = new Date(end);
    const minDate = new Date(minSince);
    const maxDate = new Date(maxSince);

    // clamp start/end to min/max
    if (startDate < minDate && endDate > maxDate) {
      startDate = minDate;
      endDate = maxDate;
    } else if (startDate < minDate) {
      startDate = minDate;
    } else if (endDate > maxDate) {
      endDate = maxDate;
    }

    // invalid range
    if (startDate > endDate) {
      // console.log(startDate, endDate, minSince, maxSince, range.start, range.end);
      return null
    };

    // convert back to YYYY-MM-DD strings
    start = startDate.toISOString().split('T')[0];
    end = endDate.toISOString().split('T')[0];

    // build created part
    const createdPart = start === end ? `created:${start}` : `created:${start}..${end}`;

    // regex to match existing created:YYYY, YYYY-MM-DD, or ranges starting 19xx/20xx
    const createdRegex = /created:(?:19|20)\d{2}(?:-\d{2}-\d{2})?(?:\.\.(?:19|20)\d{2}(?:-\d{2}-\d{2})?)?/;

    // replace existing created:... or append if not found
    let updatedQuery;
    if (createdRegex.test(baseQuery)) {
      updatedQuery = baseQuery.replace(createdRegex, createdPart);
    } else {
      updatedQuery = `${baseQuery} ${createdPart}`;
    }

    // console.log(baseQuery, "---", updatedQuery);
    return updatedQuery;
  }


  // Fetch users by repository count ranges
  async fetchUsersByYearRanges(baseQuery) {
    const allUsers = new Map(); // Use Map to automatically handle duplicates by user ID
    let totalFetched = 0;

    for (const range of this.yearRange) {
      // console.log("Year", range);
      let yearQuery = this.updateYearQuery(baseQuery, range);

      try {
        // console.log("Year Query ", yearQuery);
        const users = await this.fetchAllPages(yearQuery);

        // Add users to Map (automatically handles duplicates)
        users.forEach(user => {
          allUsers.set(user.id, user);
        });
        totalFetched += users.length;
        // console.log(yearQuery, totalFetched);

      } catch (error) {
        console.error(`Error fetching range ${range.start}-${range.end}:`, error.message);
        // Continue with other ranges
      }
      // console.log("Total Fetched : ", totalFetched);
    }

    // console.log(`Total unique users fetched: ${allUsers.size}`);
    return Array.from(allUsers.values());
  }


  updateFollowerQuery(baseQuery, range) {
    // read min/max from localStorage
    const minFollowers = parseInt(getMinFollowers(), 10);
    const maxFollowers = parseInt(getMaxFollowers(), 10);

    // fallback if not set or invalid
    const minF = Number.isInteger(minFollowers) && minFollowers >= 0 ? minFollowers : 0;
    const maxF = Number.isInteger(maxFollowers) && maxFollowers >= 0 ? maxFollowers : 999999;

    let start = range.min;
    let end = range.max;

    // clamp the range
    if (start < minF && end > maxF) {
      start = minF;
      end = maxF;
    } else if (start < minF) {
      start = minF;
    } else if (end > maxF) {
      end = maxF;
    }

    // invalid range
    if (start > end) return null;

    // build followers part
    const followersPart = start === end ? `followers:${start}` : `followers:${start}..${end}`;

    // replace existing followers:... or append if not found
    if (/followers:[^\s]+/.test(baseQuery)) {
      return baseQuery.replace(/followers:[^\s]+/, followersPart);
    } else {
      return `${baseQuery} ${followersPart}`;
    }
  }
  // Fetch users by repository count ranges
  async fetchUsersByFollowersRanges(baseQuery) {
    const allUsers = new Map(); // Use Map to automatically handle duplicates by user ID
    let totalFetched = 0;

    for (const range of this.followerRange) {

      let followerQuery = this.updateFollowerQuery(baseQuery, range);
      if (range.max < getMinFollowers() || range.min > getMaxFollowers())
        continue;

      try {
        const totalCount = await this.getTotalCount(followerQuery);
        // console.log(followerQuery, totalCount);
        let users = [];
        if (totalCount > this.maxResults) {
          users = await this.fetchUsersByYearRanges(followerQuery);
        } else {
          // console.log("Follower Query : ", followerQuery);
          users = await this.fetchAllPages(followerQuery);
        }

        // Add users to Map (automatically handles duplicates)
        users.forEach(user => {
          allUsers.set(user.id, user);
        });
        totalFetched += users.length;
        // console.log(followerQuery, totalFetched);

      } catch (error) {
        console.error(`Error fetching range ${range.min}-${range.max}:`, error.message);
        // Continue with other ranges
      }
      // console.log("Total Fetched : ", totalFetched);
    }

    // console.log(`Total unique users fetched: ${allUsers.size}`);

    return Array.from(allUsers.values());
  }

  updateRepoQuery(baseQuery, range) {
    // read from localStorage
    const minRepos = parseInt(getMinRepositories(), 10);
    const maxRepos = parseInt(getMaxRepositories(), 10);

    // fallback if not set or invalid
    const minR = Number.isInteger(minRepos) && minRepos >= 0 ? minRepos : 0;
    const maxR = Number.isInteger(maxRepos) && maxRepos >= 0 ? maxRepos : 999999;

    let start = range.min;
    let end = range.max;

    // clamp the range
    if (start < minR && end > maxR) {
      start = minR;
      end = maxR;
    } else if (start < minR) {
      start = minR;
    } else if (end > maxR) {
      end = maxR;
    }

    // invalid range
    if (start > end) return null;

    // build repos part
    const reposPart = start === end ? `repos:${start}` : `repos:${start}..${end}`;

    // replace existing repos:... or append if not found
    if (/repos:[^\s]+/.test(baseQuery)) {
      return baseQuery.replace(/repos:[^\s]+/, reposPart);
    } else {
      return `${baseQuery} ${reposPart}`;
    }
  }

  // Fetch users by repository count ranges
  async fetchUsersByRepoRanges(baseQuery, setProcessedCount, currentCount) {
    const allUsers = new Map(); // Use Map to automatically handle duplicates by user ID
    let totalFetched = 0;

    for (const range of this.repoRanges) {
      let repoQuery = this.updateRepoQuery(baseQuery, range);
      if (range.max < getMinRepositories() || range.min > getMaxRepositories())
        continue;

      try {
        const totalCount = await this.getTotalCount(repoQuery);
        // console.log(repoQuery, totalCount);

        let users = [];
        if (totalCount > this.maxResults) {
          users = await this.fetchUsersByFollowersRanges(repoQuery);
        } else {
          // console.log("Repo Query : ", repoQuery);
          users = await this.fetchAllPages(repoQuery);
        }

        // Add users to Map (automatically handles duplicates)
        users.forEach(user => {
          allUsers.set(user.id, user);
        });

        totalFetched += users.length;
      } catch (error) {
        console.error(`Error fetching range ${range.min}-${range.max}:`, error.message);
        // Continue with other ranges
      }
      // console.log("Total Fetched : ", totalFetched);
      setProcessedCount(currentCount + totalFetched);
    }

    // console.log(`Total unique users fetched: ${allUsers.size}`);

    return Array.from(allUsers.values());
  }

  // Main method to fetch all users
  async fetchAllUsers(filters = {}, setTotalCount, setProcessedCount) {
    let users = [];

    try {
      const baseQueries = this.buildBaseQueries(filters);
      var totalCount = 0, currentCount = 0;
      for (const baseQuery of baseQueries) {
        let newCount = await this.getTotalCount(baseQuery);
        let location = this.extractLocationFromQuery(baseQuery);
        console.log(location, newCount);

        totalCount += newCount;
      }
      setTotalCount(totalCount);

      // console.log(`Base query: ${baseQueries}`);
      // console.log(`Users Found : ${totalCount}`);
      if (totalCount < this.maxResults) {
        for (const baseQuery of baseQueries) {
          const fetchedUsers = await this.fetchAllPages(baseQuery);
          currentCount += fetchedUsers.length;
          setProcessedCount(currentCount);
          users.push(...fetchedUsers);
        }
        return users;
      } else {

        // if (totalCount > this.maxTotal) {
        //   const confirmed = window.confirm(
        //     `There are ${totalCount} users, which exceeds the maximum limit. Would you like to fetch them all?`
        //   );
        //   if (!confirmed) {
        //     return [];
        //   }
        // }
        for (const baseQuery of baseQueries) {
          let aSearchCount = await this.getTotalCount(baseQuery);
          var fetchedUsers = [];
          if (aSearchCount > 0) {
            if (aSearchCount > this.maxResults) {
              fetchedUsers = await this.fetchUsersByRepoRanges(baseQuery, setProcessedCount, currentCount);
            } else {
              fetchedUsers = await this.fetchAllPages(baseQuery);
            }
          }
          currentCount += fetchedUsers.length;
          setProcessedCount(currentCount);
          users.push(...fetchedUsers);
        }
        return users;
      }
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
      throw error;
    }
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get statistics about the fetched users
  getStatistics(users) {
    if (!users || users.length === 0) {
      return { total: 0 };
    }

    const repoStats = users.reduce((acc, user) => {
      const repos = user.public_repos || 0;
      acc.totalRepos += repos;
      acc.maxRepos = Math.max(acc.maxRepos, repos);
      acc.minRepos = Math.min(acc.minRepos, repos);
      return acc;
    }, { totalRepos: 0, maxRepos: 0, minRepos: Infinity });

    return {
      total: users.length,
      averageRepos: Math.round(repoStats.totalRepos / users.length),
      maxRepos: repoStats.maxRepos,
      minRepos: repoStats.minRepos === Infinity ? 0 : repoStats.minRepos
    };
  }
}

// Usage example
async function fetchGitHubUsers(filters = {}, setTotalCount, setProcessedCount) {
  try {
    // Initialize without token parameter (gets from sessionStorage)
    const fetcher = new GitHubUserFetcher();

    // console.log('Starting GitHub user fetch...');
    const users = await fetcher.fetchAllUsers(filters, setTotalCount, setProcessedCount);

    const stats = fetcher.getStatistics(users);
    // console.log(users);

    // console.log('Fetch completed!');
    // console.log('Statistics:', stats);

    return {
      users,
      statistics: stats,
      success: true
    };

  } catch (error) {
    console.error('Failed to fetch users:', error);
    return {
      users: [],
      error: error.message,
      success: false
    };
  }
}

// Export the class and function
export { GitHubUserFetcher, fetchGitHubUsers };
