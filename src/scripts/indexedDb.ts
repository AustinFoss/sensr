import { generateKeyPair } from '@libp2p/crypto/keys'
import {factory, type Libp2pConfig, type NetworkingConfig, type Setting, envAddrs} from './settings'

const DB_NAME = 'Sensr';
const DB_VERSION = 1;
const STORE_NAME = 'Settings';

export class Settings {

    dbName: string;
    storeName: string;
    settings: Setting[];

    constructor() {
      this.dbName = DB_NAME
      this.storeName = STORE_NAME
      this.settings = []
    }

    public async init(remoteServer?: {remoteId: string, multiAddrStrs: string[]}) {
      
      let db = await openDatabase(remoteServer)
      this.settings = await getAllSettings(db)
      db.close()
      return this.settings
    }

    public getAllSettings(): Setting[] {

      console.log("Env Addr: ", envAddrs);
      return this.settings
    }

    public getSetting(settingName: string): Libp2pConfig | NetworkingConfig {

      return this.settings.filter((setting) => setting.name === settingName)[0].value
    }

    public async updateSetting(updatedSetting: Setting): Promise<Setting[]> {

      let db = await openDatabase()

      let transaction = db.transaction(["Settings"], "readwrite")
      const store = transaction.objectStore("Settings");
      const index = store.index("name");

      const query = index.get(updatedSetting.name); // Query by name using the index

      query.onsuccess = () => {
          query.result.value = updatedSetting.value
          store.put(query.result)
      }

      db.close()

      this.init()
      
      return this.getAllSettings()
    }

}

// Function to open or create IndexedDB
export function openDatabase(remoteServer?: {remoteId: string, multiAddrStrs: string[]}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Open database request
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Handle database upgrade (creation or schema changes)
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          let store = db.createObjectStore(STORE_NAME, {
          keyPath: 'index', // Primary key
          autoIncrement: true // Auto-incrementing keys
          });
          store.createIndex("name", "name", { unique: true });     
          
          // TODO: now set factory settings in the Settings Store
          let defaultConfigs = factory.settings

          for(let config in defaultConfigs) {
              let cfg = defaultConfigs[config] 
                  const addRequest = store.add(cfg);
          }

          const nameIndex = store.index("name");
          const request1 = nameIndex.get("LibP2P");

          request1.onsuccess = async () => {
            console.log("Updating LibP2P settings with new Key Pairs");
            
            let key 
            key = await generateKeyPair("Ed25519")
            request1.result.value.swNode.privKey = key.raw
            key = await generateKeyPair("Ed25519")
            request1.result.value.windowNode.privKey = key.raw
            store.put(request1.result)
        
          }

          const request2 = nameIndex.get("Networking");
          console.log("Remote server env: ", remoteServer);
          
          request2.onsuccess = async () => {
            request2.result.value.remoteServers[0] = remoteServer
            request2.result.value.networks[0].providerInfo.config.executionRpc = request2.result.value.networks[0].providerInfo.config.executionRpc + remoteServer?.remoteId + ".libp2p"
            request2.result.value.networks[0].providerInfo.config.consensusRpc = request2.result.value.networks[0].providerInfo.config.consensusRpc + remoteServer?.remoteId + ".libp2p"
            store.put(request2.result)
          }
          

        }        
    };

    // Handle successful database opening
    request.onsuccess = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    // Handle errors
    request.onerror = (event: Event) => {
      reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
    };
  });
}

// Example usage
export async function initializeDatabase() {
  try {
    const db = await openDatabase();
    console.log(`Database ${DB_NAME} opened successfully`);
    
    // Close the database when done
    db.close();
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

export async function getAllSettings(db: IDBDatabase): Promise<Setting[] | any> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["Settings"], "readonly");
    const objectStore = transaction.objectStore("Settings");
    const request = objectStore.getAll();

    request.onsuccess = () => {
      resolve(request.result); // Array of all records
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
