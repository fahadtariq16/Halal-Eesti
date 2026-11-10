// Where reviews are kept. All stores share one small interface:
//   all() -> Promise<review[]>     add(review) -> Promise     remove(id) -> Promise<boolean>
//
// - Memory: tests.
// - File (data/reviews.json): local development. NOT for free hosting, which wipes files on restart.
// - MongoDB: production. Used automatically when MONGODB_URI is set (see index.js).

import { readFile, writeFile } from 'node:fs/promises';

export function createMemoryReviewStore(initial = []) {
  const reviews = [...initial];
  return {
    async all() { return reviews.map((r) => ({ ...r })); },
    async add(r) { reviews.push({ ...r }); },
    async remove(id) {
      const i = reviews.findIndex((r) => r.id === id);
      if (i === -1) return false;
      reviews.splice(i, 1);
      return true;
    }
  };
}

export function createFileReviewStore(fileUrl) {
  let queue = Promise.resolve();
  const read = async () => {
    try { return JSON.parse(await readFile(fileUrl, 'utf8')); }
    catch (err) { if (err.code === 'ENOENT') return []; throw err; }
  };
  // Writes go through one queue so two reviews at the same moment can't overwrite each other.
  const write = (fn) => (queue = queue.then(async () => {
    const list = await read();
    const result = fn(list);
    await writeFile(fileUrl, JSON.stringify(list, null, 2));
    return result;
  }));
  return {
    all: read,
    add: (r) => write((list) => { list.push(r); }),
    remove: (id) => write((list) => {
      const i = list.findIndex((r) => r.id === id);
      if (i === -1) return false;
      list.splice(i, 1);
      return true;
    })
  };
}

/** Wraps a MongoDB collection. The review id is stored as _id. */
export function createMongoReviewStore(collection) {
  const fromDoc = ({ _id, ...rest }) => ({ id: _id, ...rest });
  return {
    async all() { return (await collection.find({}).toArray()).map(fromDoc); },
    async add({ id, ...rest }) { await collection.insertOne({ _id: id, ...rest }); },
    async remove(id) { return (await collection.deleteOne({ _id: id })).deletedCount === 1; }
  };
}

/** Connects to MongoDB and returns a store. The driver is only loaded when you use it. */
export async function connectMongoReviewStore(uri, dbName = 'halal') {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(uri);
  await client.connect();
  const collection = client.db(dbName).collection('reviews');
  await collection.createIndex({ placeId: 1, createdAt: -1 });
  return createMongoReviewStore(collection);
}
