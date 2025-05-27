const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('ebudget');

    // Fetch data from collections
    console.log('\n=== Branch Master Examples ===');
    const branches = await db.collection('branchs_master').find().limit(3).toArray();
    if (branches.length === 0) {
      console.log('No branch data found');
    } else {
      branches.forEach((branch, index) => {
        console.log(`\nBranch ${index + 1}:`);
        console.log(JSON.stringify(branch, null, 2));
      });
    }

    console.log('\n=== GL Master Examples ===');
    const gls = await db.collection('gl_master').find().limit(3).toArray();
    if (gls.length === 0) {
      console.log('No GL data found');
    } else {
      gls.forEach((gl, index) => {
        console.log(`\nGL ${index + 1}:`);
        console.log(JSON.stringify(gl, null, 2));
      });
    }

    console.log('\n=== User Examples ===');
    const users = await db.collection('users').find().limit(3).toArray();
    if (users.length === 0) {
      console.log('No user data found');
    } else {
      users.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(JSON.stringify(user, null, 2));
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

main(); 