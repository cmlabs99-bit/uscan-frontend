import Dexie from 'dexie';

class GitHubUserDatabase extends Dexie {
  constructor() {
    super('GitHubUserDB');
    this.version(1).stores({
      users: '++id, githubId, username, name, email, location, followers, repositoryCount, joinedAt, owner, createdAt',
      myusers: '++id, githubId, username, name, email, location, followers, repositoryCount, status, joinedAt, statusText, createdAt'
    });
  }
}

export const db = new GitHubUserDatabase();