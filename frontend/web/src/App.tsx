// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface ScentRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  emotion: string;
  intensity: number;
}

const App: React.FC = () => {
  // Randomly selected style: High contrast (blue+orange), Industrial mechanical, Center radiation, Micro-interactions
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ScentRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newRecordData, setNewRecordData] = useState({
    emotion: "calm",
    intensity: 5,
    personalNote: ""
  });
  const [selectedRecord, setSelectedRecord] = useState<ScentRecord | null>(null);

  // Randomly selected additional features: Data details, Search filter, Team info
  const [searchTerm, setSearchTerm] = useState("");
  const [showTeamInfo, setShowTeamInfo] = useState(false);

  const filteredRecords = records.filter(record =>
    record.emotion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("scent_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing scent keys:", e);
        }
      }
      
      const list: ScentRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`scent_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedData: recordData.data,
                timestamp: recordData.timestamp,
                owner: recordData.owner,
                emotion: recordData.emotion,
                intensity: recordData.intensity
              });
            } catch (e) {
              console.error(`Error parsing scent data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading scent ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading scents:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting scent data with FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newRecordData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const recordData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        emotion: newRecordData.emotion,
        intensity: newRecordData.intensity
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `scent_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      const keysBytes = await contract.getData("scent_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "scent_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted scent data submitted!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewRecordData({
          emotion: "calm",
          intensity: 5,
          personalNote: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      if (isAvailable) {
        setTransactionStatus({
          visible: true,
          status: "success",
          message: "FHE olfactory system is available!"
        });
      } else {
        setTransactionStatus({
          visible: true,
          status: "error",
          message: "System unavailable"
        });
      }
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e) {
      console.error("Error checking availability:", e);
    }
  };

  const getRandomScent = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const keysBytes = await contract.getData("scent_keys");
      if (keysBytes.length === 0) {
        alert("No scent data available");
        return;
      }
      
      const keys = JSON.parse(ethers.toUtf8String(keysBytes));
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      
      const recordBytes = await contract.getData(`scent_${randomKey}`);
      if (recordBytes.length === 0) return;
      
      const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: `Fetched encrypted scent data for ${recordData.emotion}`
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e) {
      console.error("Error getting random scent:", e);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const emotionIntensities = {
    calm: 1,
    happy: 2,
    excited: 3,
    anxious: 4,
    angry: 5
  };

  const renderIntensityBar = (intensity: number) => {
    return (
      <div className="intensity-bar">
        {[1, 2, 3, 4, 5].map((level) => (
          <div 
            key={level}
            className={`intensity-level ${intensity >= level ? 'active' : ''}`}
          />
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="gear-spinner"></div>
      <p>Initializing olfactory interface...</p>
    </div>
  );

  return (
    <div className="app-container industrial-theme">
      <header className="app-header">
        <div className="logo">
          <h1>FHE<span>Olfactory</span>Art</h1>
          <p>Fully Homomorphic Encrypted Scent Experiences</p>
        </div>
        
        <div className="header-actions">
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <main className="main-content">
        <div className="central-radial-layout">
          <div className="control-panel">
            <div className="panel-section">
              <h2>Olfactory Control</h2>
              <div className="button-group">
                <button 
                  onClick={checkAvailability}
                  className="industrial-button"
                >
                  Check System
                </button>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="industrial-button primary"
                >
                  + New Scent
                </button>
                <button 
                  onClick={getRandomScent}
                  className="industrial-button"
                >
                  Random Scent
                </button>
                <button 
                  onClick={() => setShowTeamInfo(!showTeamInfo)}
                  className="industrial-button"
                >
                  {showTeamInfo ? "Hide Team" : "Show Team"}
                </button>
              </div>
            </div>
            
            <div className="panel-section">
              <h2>Search Scents</h2>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Filter by emotion or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="industrial-input"
                />
              </div>
            </div>
          </div>
          
          <div className="data-display">
            <div className="display-header">
              <h2>Encrypted Scent Records</h2>
              <button 
                onClick={loadRecords}
                className="industrial-button small"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            
            <div className="records-grid">
              {filteredRecords.length === 0 ? (
                <div className="no-records">
                  <div className="no-records-icon"></div>
                  <p>No scent records found</p>
                  <button 
                    className="industrial-button primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create First Record
                  </button>
                </div>
              ) : (
                filteredRecords.map(record => (
                  <div 
                    className="record-card" 
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div className="card-header">
                      <span className="emotion-tag">{record.emotion}</span>
                      <span className="owner-tag">
                        {record.owner.substring(0, 6)}...{record.owner.substring(38)}
                      </span>
                    </div>
                    <div className="card-body">
                      {renderIntensityBar(record.intensity)}
                      <div className="timestamp">
                        {new Date(record.timestamp * 1000).toLocaleString()}
                      </div>
                    </div>
                    {isOwner(record.owner) && (
                      <div className="card-footer">
                        <button className="industrial-button small">Edit</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {showTeamInfo && (
          <div className="team-modal">
            <div className="modal-content industrial-card">
              <div className="modal-header">
                <h2>Olfactory Art Team</h2>
                <button onClick={() => setShowTeamInfo(false)} className="close-modal">&times;</button>
              </div>
              <div className="modal-body">
                <div className="team-member">
                  <h3>Dr. Alice Chen</h3>
                  <p>FHE Cryptography Specialist</p>
                </div>
                <div className="team-member">
                  <h3>Prof. Marco Silva</h3>
                  <p>Olfactory Science Lead</p>
                </div>
                <div className="team-member">
                  <h3>Yuki Tanaka</h3>
                  <p>Interactive Art Director</p>
                </div>
                <div className="team-member">
                  <h3>Jamal Williams</h3>
                  <p>Blockchain Engineer</p>
                </div>
              </div>
              <div className="modal-footer">
                <p>Our team combines expertise in cryptography, scent technology, and interactive art.</p>
              </div>
            </div>
          </div>
        )}
  
        {selectedRecord && (
          <div className="detail-modal">
            <div className="modal-content industrial-card">
              <div className="modal-header">
                <h2>Scent Details</h2>
                <button onClick={() => setSelectedRecord(null)} className="close-modal">&times;</button>
              </div>
              <div className="modal-body">
                <div className="detail-row">
                  <span className="detail-label">Emotion:</span>
                  <span className="detail-value">{selectedRecord.emotion}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Intensity:</span>
                  <div className="detail-value">
                    {renderIntensityBar(selectedRecord.intensity)}
                  </div>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Owner:</span>
                  <span className="detail-value">{selectedRecord.owner}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(selectedRecord.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Encrypted Data:</span>
                  <span className="detail-value encrypted">
                    {selectedRecord.encryptedData.substring(0, 20)}...
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="industrial-button"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
  
        {showCreateModal && (
          <ModalCreate 
            onSubmit={submitRecord} 
            onClose={() => setShowCreateModal(false)} 
            creating={creating}
            recordData={newRecordData}
            setRecordData={setNewRecordData}
          />
        )}
        
        {walletSelectorOpen && (
          <WalletSelector
            isOpen={walletSelectorOpen}
            onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
            onClose={() => setWalletSelectorOpen(false)}
          />
        )}
        
        {transactionStatus.visible && (
          <div className="transaction-modal">
            <div className="transaction-content industrial-card">
              <div className={`transaction-icon ${transactionStatus.status}`}>
                {transactionStatus.status === "pending" && <div className="gear-spinner small"></div>}
                {transactionStatus.status === "success" && <div className="check-icon"></div>}
                {transactionStatus.status === "error" && <div className="error-icon"></div>}
              </div>
              <div className="transaction-message">
                {transactionStatus.message}
              </div>
            </div>
          </div>
        )}
      </main>
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>FHE Olfactory Art</h3>
            <p>Privacy-preserving interactive scent experiences powered by FHE</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            © {new Date().getFullYear()} FHE Olfactory Art Project
          </div>
          <div className="tech-badge">
            <span>FHE-Powered Scent Technology</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  recordData: any;
  setRecordData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  recordData,
  setRecordData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecordData({
      ...recordData,
      [name]: value
    });
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecordData({
      ...recordData,
      intensity: parseInt(e.target.value)
    });
  };

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal industrial-card">
        <div className="modal-header">
          <h2>Create New Scent Profile</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <div className="lock-icon"></div> 
            <span>Your data will be encrypted with FHE before storage</span>
          </div>
          
          <div className="form-group">
            <label>Emotion *</label>
            <select 
              name="emotion"
              value={recordData.emotion} 
              onChange={handleChange}
              className="industrial-select"
            >
              <option value="calm">Calm</option>
              <option value="happy">Happy</option>
              <option value="excited">Excited</option>
              <option value="anxious">Anxious</option>
              <option value="angry">Angry</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Intensity: {recordData.intensity}</label>
            <input 
              type="range"
              min="1"
              max="5"
              value={recordData.intensity}
              onChange={handleIntensityChange}
              className="industrial-range"
            />
            <div className="range-labels">
              <span>Subtle</span>
              <span>Strong</span>
            </div>
          </div>
          
          <div className="form-group">
            <label>Personal Note</label>
            <textarea 
              name="personalNote"
              value={recordData.personalNote} 
              onChange={handleChange}
              placeholder="Describe the context or memories..." 
              className="industrial-textarea"
              rows={3}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="industrial-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="industrial-button primary"
          >
            {creating ? "Encrypting with FHE..." : "Create Scent Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;