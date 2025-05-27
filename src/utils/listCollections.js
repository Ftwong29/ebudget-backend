const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ebudget', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function listCollections() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
  } catch (error) {
    console.error('Error listing collections:', error);
  } finally {
    mongoose.connection.close();
  }
}

listCollections(); 