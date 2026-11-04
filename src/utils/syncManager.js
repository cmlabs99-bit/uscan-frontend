import { syncMyGitHubUsers, syncAllGitHubUsers } from '../database/databaseSync.js';
import { db } from '../database/db.js';

export class SyncManager {
    constructor() {
        this.isInitialized = false;
        this.isSyncing = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // console.log('Initializing database...');
            await db.open();
            this.isInitialized = true;
            // console.log('✅ Database initialized');
        } catch (error) {
            // console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async syncAll(onFastLoad = false) {

        if (this.isSyncing) {
            // console.log('Sync already in progress');
            return;
        }

        this.isSyncing = true;

        try {
            await this.initialize();

            const users = await db.users.toArray();
            // console.log("Database User List : ", users.length);
            if (users.length && onFastLoad) {
                return;
            }

            const confirmed = window.confirm(`Would you like to sync?`);
            if (!confirmed) {
                return;
            }

            // console.log('Starting full sync...');
            const [myUsersCount, allUsersCount] = await Promise.all([
                // syncMyGitHubUsers(),
                syncAllGitHubUsers()
            ]);

            // console.log(`✅ Full sync complete: ${myUsersCount} my users, ${allUsersCount} all users`);
            return { myUsersCount, allUsersCount };

        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    async syncMyUsers() {
        if (this.isSyncing) {
            // console.log('Sync already in progress');
            return;
        }

        this.isSyncing = true;

        try {
            await this.initialize();
            const count = await syncMyGitHubUsers();
            return count;
        } catch (error) {
            // console.error('My users sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    async syncAllUsers() {
        if (this.isSyncing) {
            // console.log('Sync already in progress');
            return;
        }

        this.isSyncing = true;

        try {
            await this.initialize();
            const count = await syncAllGitHubUsers();
            return count;
        } catch (error) {
            console.error('All users sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    get status() {
        return {
            initialized: this.isInitialized,
            syncing: this.isSyncing
        };
    }
}

// Export singleton instance
export const syncManager = new SyncManager();