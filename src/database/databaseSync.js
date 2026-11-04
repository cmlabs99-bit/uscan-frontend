import { db } from './db.js';
import apiService from '../services/apiService.js';

// Sync my GitHub users to db.myusers
export async function syncMyGitHubUsers() {
    try {
        // console.log('Syncing my GitHub users...');
        await db.myusers.clear();

        let page = 1;
        let totalSynced = 0;

        while (true) {
            const response = await apiService.getMyGitHubUsers({ page, limit: 10000 });

            if (!response.users || response.users.length === 0) break;

            const usersToInsert = response.users.map(user => ({
                githubId: user.githubId,
                username: user.username,
                name: user.name,
                email: user.email,
                location: user.location,
                followers: user.followers,
                repositoryCount: user.repositoryCount,
                status: user.status,
                joinedAt: user.joinedAt,
                owner: user.owner,
                statusText: user.statusText,
                createdAt: new Date(user.createdAt)
            }));

            await db.myusers.bulkAdd(usersToInsert);
            totalSynced += usersToInsert.length;

            if (page >= response.totalPages) break;
            page++;
        }

        // console.log(`✅ My users synced: ${totalSynced}`);
        return totalSynced;

    } catch (error) {
        console.error('Error syncing my GitHub users:', error);
        throw error;
    }
}

// Sync all GitHub users to db.users
export async function syncAllGitHubUsers() {
    try {
        // console.log('Syncing all GitHub users...');
        await db.users.clear();

        let page = 1;
        let totalSynced = 0;

        while (true) {
            const response = await apiService.getAllGitHubUsersSimple({ page, limit: 10000 });

            if (!response.users || response.users.length === 0) break;

            const usersToInsert = response.users.map(user => ({
                githubId: user.githubId,
                username: user.username,
                name: user.username, // Using username as name for simplified data
                email: null,
                location: null,
                followers: null,
                repositoryCount: null,
                taskerUsername: user.taskerUsername,
                status: user.status,
                owner: user.owner,
                statusText: user.statusText,
                createdAt: new Date()
            }));

            await db.users.bulkAdd(usersToInsert);
            totalSynced += usersToInsert.length;

            if (page >= response.totalPages) break;
            page++;
        }

        // console.log(`✅ All users synced: ${totalSynced}`);
        return totalSynced;

    } catch (error) {
        console.error('Error syncing all GitHub users:', error);
        throw error;
    }
}


// Sync all GitHub users to db.users
export async function syncSelectedUsers(users) {
    try {
        // console.log('Syncing all selected users...');
        let totalSynced = 0;

        const usersToInsert = users.map(user => ({
            githubId: user.id || user.githubId,
            username: user.login || user.username,
            owner: user.owner
        }));

        // console.log(usersToInsert);
        const beforeCount = await db.users.count();
        await db.users.bulkAdd(usersToInsert);
        const afterCount = await db.users.count();
        totalSynced += usersToInsert.length;

        // console.log(beforeCount, afterCount);
        // console.log(`✅ All selected users synced: ${totalSynced}`);
        return totalSynced;

    } catch (error) {
        console.error('Error syncing selected users:', error);
        throw error;
    }
}