import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { Header } from './Header';
import { SurveyResults } from './SurveyResults';
import { SurveyVote } from './SurveyVote';
import { SURVEY_CONTRACT_ADDRESS } from '../config/contracts';
import '../styles/SurveyApp.css';

export function SurveyApp() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'vote' | 'results'>('vote');
  const [contractAddress, setContractAddress] = useState<string>(SURVEY_CONTRACT_ADDRESS);
  const contractReady = isAddress(contractAddress);

  return (
    <div className="app">
      <Header />
      <main className="main">
        <section className="card">
          <div className="cardHeader">
            <h2 className="cardTitle">Encrypted Survey</h2>
            <p className="cardSubtitle">
              Your choices are encrypted client-side and only aggregated counts are stored on-chain.
            </p>
          </div>

          {!isConnected && (
            <div className="notice">
              <div className="noticeTitle">Connect your wallet to continue</div>
              <div className="noticeBody">The survey is available on Sepolia.</div>
            </div>
          )}

          <div className="notice" style={{ borderColor: contractReady ? '#bbf7d0' : '#fecaca', background: '#ffffff' }}>
            <div className="noticeTitle" style={{ color: contractReady ? '#065f46' : '#991b1b' }}>
              Contract address
            </div>
            <div className="noticeBody" style={{ color: '#374151' }}>
              <input
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value.trim())}
                placeholder="0x..."
                spellCheck={false}
                className="contractInput"
              />
              <div style={{ fontSize: 12, marginTop: 6, color: contractReady ? '#065f46' : '#991b1b' }}>
                {contractReady
                  ? 'Valid address'
                  : 'Paste the Sepolia deployment address (or run `npx hardhat survey:sync-frontend-abi`).'}
              </div>
            </div>
          </div>

          <div className="tabs">
            <button
              type="button"
              onClick={() => setActiveTab('vote')}
              className={`tab ${activeTab === 'vote' ? 'active' : ''}`}
            >
              Vote
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`tab ${activeTab === 'results' ? 'active' : ''}`}
            >
              Results
            </button>
          </div>

          {activeTab === 'vote' ? (
            <SurveyVote contractAddress={contractAddress} />
          ) : (
            <SurveyResults contractAddress={contractAddress} />
          )}
        </section>
      </main>
    </div>
  );
}
