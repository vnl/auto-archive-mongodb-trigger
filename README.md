# Auto Archive Atlas Trigger
[Atlas Trigger](https://docs.atlas.mongodb.com/triggers/) function that archives data from one Atlas cluster to another. This allows for Data Tiering in Atlas using 2 Atlas clusters. 

## Use Case: Data Tiering using 2 Atlas Clusters
Data Tiering using two Atlas clusters can be an alternative when [Atlas Data Lake](https://www.mongodb.com/atlas/data-lake) or Atlas Online Archive does not provide sufficient query response times due to the underlying S3 storage that is being used. With this approach, one Atlas cluster is used for hot data, and one Atlas cluster for cold data. The cold cluster runs on a lower cluster tier to reduce costs. [Federated Queries](https://developer.mongodb.com/how-to/query-multiple-databases-with-atlas-data-lake/) allows the two clusters to be queried as if it were a single cluster. The only piece missing is a mechanism to archive data from the hot cluster to the Cold cluster. This is where the Auto Archive Atlas Trigger comes into play.

## Instructions
***DISCLAIMER: This is not an officially supported MongoDB product and has not been battle tested in large production workloads. Use at your own risk!***

### Adding Atlas Trigger
* Open Atlas in your browser and navigate to your Atlas Project and the *Project Overview* screen. Click on *Triggers* on the left navigation. And hit the *Add Trigger* button.
* On the *Add Trigger* screen:
  * Select *Scheduled* as the Trigger Type so that the trigger runs every few minutes.
  * Name the Trigger.
  * Under *Schedule Type*: for *Repeat once by* select every *2* minutes. An Atlas trigger has a maximum runtime of 90 seconds so this ensures that no two Triggers will be running simultaneously.
  * From the *Link Data Source(s)* dropdown select both the cluster you want to archive data from, and the cluster you want to archive the data to. If you haven't linked these clusters to any other Triggers or Realm Applications before, you will have to click the *Link* button after selecting the cluster.
  * Open the [function.js](https://github.com/robbertkauffman/auto-archive-atlas-trigger/edit/main/function.js) file on Github and copy the contents of the file, and paste it in the *Function* textarea.
  * Edit the function code:
    * Line 3: *sourceCluster*: service name of the source cluster. Should be the same as the clustername if you linked the cluster from the *Add Trigger* screen.
    * Line 4: *targetCluster*: service name of the target cluster. Should be the same as the clustername if you linked the cluster from the *Add Trigger* screen.
    * Line 5: *db*: name of database containing the collection that needs to be automatically archived.
    * Line 6: *collection*: name of collection that needs to be automatically archived.
    * Line 7: *dateField*: name of field that will be filtered on when querying for documents that need to be archived. Typically a date field.
    * Line 8: *archiveAfter*: maximum age of a document based on *dateField* to determine if a document should be archived. If you want to archive based on something other than date, please modify lines 21-24.
  * Test the trigger by uncommenting line 32 and clicking the *Run* button. In test mode it will only find the to be archived documents but not archive them. Don't forget to comment line 32 after the test completed successfully.
  * Hit the Save button on the bottom right corner.
* The Atlas Trigger should now run every 2 minutes (or on a different interval depending on what you configured). See the [Trigger Logs](https://docs.mongodb.com/realm/logs/trigger/) for more information on how many documents were archived during each execution, as well as any potential warnings or errors.
![Screenshot of Add Trigger screen](https://github.com/robbertkauffman/auto-archive-atlas-trigger/blob/92df1d9b86cda7310cf6cfd7a6c0e1dd17c997ad/add-trigger.png?raw=true)


### Configuring Federated Queries
Federated Queries is provided by Atlas Data Lake. Even though you might not be storing any of your data in S3 through Data Lake or Online Archive, you will have to configure a Data Lake in order to be able to use Federated Queries for querying across 2 Atlas clusters.

* Open Atlas in your browser and navigate to your Atlas Project and the *Project Overview* screen. Click on *Data Lake* on the left navigation. And hit the *Create Data Lake* or *Configure a New Data Lake* button.
* On the *Data Lake Configuration screen*:
  * Add the hot cluster as a data store:
    * Click *Connect Data*.
    * Select *Atlas Cluster* from the three options, and first choose the cluster that holds your hot data.
    * Select the namespaces that need to be queried using Federated Queries, and click *Next*.
  * Add the cold cluster as a data store:
    * Click *Add Data Store* from the Data Stores column on the left.
    * Select *Atlas Cluster* from the three options, and now choose the cluster that holds your cold data.
    * Again, select the namespaces that need to be queried using Federated Queries, and click *Next*. Typically, you would select the same namespaces here as the ones that you selected for the hot cluster.
  * Rename the namespaces (Database0, Collection0, etc.) in the Data Lake column on the right to match the names of the source namespaces. Edit the names by clicking the pencil icon.
  * Drag-and-drop the data sources/namespaces from the Data Stores on the left to the Data Lake on the right, so that they are listed right underneath the database and collection name.
  * Hit *Save* in the bottom right corner.
* Federated Queries should now be configured and ready to use.
* Click *Connect* on the right to get the connection string to the Data Lake, and you can connect to the cluster using Compass, the MongoDB drivers, the mongo shell, etc. This is the connection string you will want to use whenever you want to do federated queries across the hot and cold Atlas clusters. You can still use the individual connection string of each cluster if you only need to query data of that individual cluster.
![Screenshot of Add Trigger screen](https://github.com/robbertkauffman/auto-archive-atlas-trigger/blob/92df1d9b86cda7310cf6cfd7a6c0e1dd17c997ad/data-lake-configuration.png?raw=true)
