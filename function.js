exports = async function() {
  // CHANGE THESE BELOW
  const sourceCluster = "hot-cluster"; // service name of source/hot cluster
  const targetCluster = "warm-cluster"; // service name of target/warm/cold cluster
  const db = "sample_supplies";
  const collection = "sales";
  const dateField = "saleDate"; // field name for date field that will be queried on
  const archiveAfter = 60; // number of days after which to archive
  
  // settings (not required to change)
  const limit = 400; // decrease if archiving takes longer than function runtime limit of 90s
  const stagingDb = "dataTiering";
  const stagingCollName = "staging";
  
  // collection handles
  const sourceCollection = context.services.get(sourceCluster).db(db).collection(collName);
  const targetCollection = context.services.get(targetCluster).db(db).collection(collName);
  const targetStagingCollection = context.services.get(targetCluster).db(stagingDb).collection(stagingCollName);
  
  // DO NOT CHANGE THESE
  const archiveDate = new Date();
  archiveDate.setDate(-archiveAfter); // change number of days
  // const archiveDate = new Date("2018-01-01T00:00:00.000+00:00"); // uncomment when using with sample dataset
  
  const query = { [dateField]: { $gt: archiveDate }};
  
  // =================================
  
  // TODO: check if dbs and collections exist
  
  // uncomment next line to enable test mode
  // const testMode = true;
  
  if (typeof testMode !== 'undefined' && testMode) {
    await findDocsToArchive(sourceCollection, query, limit);
  } else {
    let docs = [];
    try {
      // query any remaining documents in staging collection first
      // in case a previous run didn't complete fully
      docs = await findDocsToArchive(targetStagingCollection, {}, limit);
      // if nothing returned, just do a regular run by querying source and copying to staging
      if (docs.length == 0) {
        docs = await findDocsToArchive(sourceCollection, query, limit);
        docs.length > 0 && await copyDocsToStaging(targetStagingCollection, docs);
      } else {
        console.log(`Found ${docs.length} documents in staging collection. Previous run likely didn't complete. `
                    + `Will retry publishing, might see duplicate key errors if already published before.`);
      }
      
      for (const doc of docs) {
        // console.log(doc._id);
        await publishDoc(targetCollection, doc);
        await deleteDocument(sourceCollection, doc._id);
        await deleteDocument(targetStagingCollection, doc._id);
      }
    } catch (err) {
      throw err;
    }
    console.log(`Archived ${docs.length} documents`);
  }
  
  return true;
};

async function deleteDocsInStaging(collection) {
  return collection.deleteMany({})
  .then(result => {
    if (result && result.deletedCount > 1) {
      console.log(`Deleted ${result.deletedCount} documents from staging`);
      return true;
    } else {
      console.log('No documents found in staging collection');
    }
    return false;
  })
  .catch(err => {
    console.error(`Delete in staging failed with error: ${err}`);
    throw err;
  });
}

async function findDocsToArchive(collection, query, limit) {
  return collection.find(query).limit(limit).toArray()
  .then(docs => {
    docs.length > 0 && console.log(`Found ${docs.length} documents to be archived`);
    return docs;
  })
  .catch(err => console.error(`Failed to query to be archived documents: ${err}`));
}

async function copyDocsToStaging(collection, docs) {
  return collection.insertMany(docs)
  .then(result => {
    if (result && result.insertedIds.length === docs.length) {
      console.log(`Successfully copied ${result.insertedIds.length} documents to staging`);
      return true;
    } else if (result && result.insertedIds.length > 0) {
      console.warn("Copied some, not all, documents to staging")
    } else {
      throw "Inserted zero documents"
    }
  })
  .catch(err => {
    console.error(`Failed to copy documents to staging: ${err}`);
    return false;
  });
}

async function publishDoc(collection, doc) {
  return collection.insertOne(doc)
  .then(result => {
    if (result && result.insertedId) {
      // console.log(`Published document with id: ${result.insertedId}`);
      return true
    } else {
      throw `Could not insert document ${doc}`;
    }
    return false;
  })
  .catch(err => {
    if (err instanceof FunctionError && err.message.startsWith("Duplicate key error")) {
      console.warn(`Document with id ${doc._id} already exists, continuing: ${err.message}`);
    } else {
      console.error(`Failed to publish document: ${err}`)
      throw err;
    }
  });
}

async function deleteDocument(collection, id) {
  return collection.deleteOne({_id: id})
  .then(result => {
    if (result && result.deletedCount === 1) {
      // console.log(`Deleted document with id: ${id}`);
      return true;
    } else {
      throw "Could not find document to delete";
    }
    return false;
  })
  .catch(err => {
    if (err instanceof FunctionError && err.message.startsWith("Could not find document to delete")) {
      console.warn(`Could not find document to delete with id ${id} , continuing: ${err.message}`);
    } else {
      console.error(`Delete on source failed with error: ${err}`);
      throw err;
    }
  });
}
