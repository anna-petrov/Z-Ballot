import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract } from 'ethers';
import { isAddress } from 'viem';

import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { SURVEY_QUESTIONS } from '../config/survey';
import { SURVEY_CONTRACT_ABI } from '../config/contracts';
import '../styles/SurveyResults.css';

function isReadyContractAddress(address: string): address is `0x${string}` {
  return isAddress(address);
}

export function SurveyResults({ contractAddress }: { contractAddress: string }) {
  const { isConnected, address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [questionId, setQuestionId] = useState<number>(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [counts, setCounts] = useState<number[] | null>(null);

  const contractReady = isReadyContractAddress(contractAddress);

  const { data: optionCount } = useReadContract({
    address: contractReady ? contractAddress : undefined,
    abi: SURVEY_CONTRACT_ABI,
    functionName: 'optionCount',
    args: [questionId],
    query: { enabled: contractReady },
  });

  const { data: encryptedCounts } = useReadContract({
    address: contractReady ? contractAddress : undefined,
    abi: SURVEY_CONTRACT_ABI,
    functionName: 'getEncryptedCounts',
    args: [questionId],
    query: { enabled: contractReady },
  });

  const expectedOptions = useMemo(() => {
    const oc = optionCount ? Number(optionCount) : SURVEY_QUESTIONS[questionId]?.options.length ?? 0;
    return Math.min(oc, SURVEY_QUESTIONS[questionId]?.options.length ?? oc);
  }, [optionCount, questionId]);

  const requestPublic = async () => {
    setError('');
    setTxHash('');
    setCounts(null);

    if (!isConnected || !contractReady || !signerPromise) return;

    setIsRequesting(true);
    try {
      const signer = await signerPromise;
      const contract = new Contract(contractAddress, SURVEY_CONTRACT_ABI, signer);
      const tx = await contract.makeQuestionResultsPublic(questionId);
      setTxHash(tx.hash);
      await tx.wait();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsRequesting(false);
    }
  };

  const decrypt = async () => {
    setError('');
    setCounts(null);

    if (!contractReady || !instance || zamaLoading || zamaError) return;
    if (!encryptedCounts) return;

    setIsDecrypting(true);
    try {
      const handles = (encryptedCounts as readonly `0x${string}`[]).slice(0, expectedOptions);
      const result = await instance.publicDecrypt(handles);
      const next = handles.map((h) => {
        const value = result.clearValues[h];
        return typeof value === 'bigint' ? Number(value) : Number(BigInt(value));
      });
      setCounts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!contractReady) {
    return (
      <div className="results">
        <div className="errorBox">
          <div className="errorTitle">Contract address not configured</div>
          <div className="errorBody">
            Run the Hardhat task <code>npx hardhat survey:sync-frontend-abi</code> after deploying to Sepolia.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results">
      <div className="row">
        <label className="label" htmlFor="question">
          Question
        </label>
        <select
          id="question"
          className="select"
          value={questionId}
          onChange={(e) => setQuestionId(Number(e.target.value))}
          disabled={isRequesting || isDecrypting}
        >
          {SURVEY_QUESTIONS.map((q) => (
            <option key={q.id} value={q.id}>
              {q.id + 1}. {q.title}
            </option>
          ))}
        </select>
      </div>

      <div className="actions">
        <button
          type="button"
          className="secondaryButton"
          onClick={() => void requestPublic()}
          disabled={!isConnected || !address || !signerPromise || isRequesting || isDecrypting}
        >
          {isRequesting ? 'Requesting…' : 'Request public results (on-chain)'}
        </button>
        <button
          type="button"
          className="primaryButton"
          onClick={() => void decrypt()}
          disabled={!instance || zamaLoading || !!zamaError || isDecrypting || isRequesting}
        >
          {isDecrypting ? 'Decrypting…' : 'Decrypt counts (public)'}
        </button>
      </div>

      {txHash && (
        <div className="infoBox">
          <div className="infoTitle">Transaction</div>
          <div className="infoBody">
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="errorBox">
          <div className="errorTitle">Error</div>
          <div className="errorBody">{error}</div>
        </div>
      )}

      {counts && (
        <div className="countsCard">
          <div className="countsTitle">Counts</div>
          <ul className="countsList">
            {SURVEY_QUESTIONS[questionId].options.slice(0, expectedOptions).map((label, idx) => (
              <li key={idx} className="countRow">
                <span className="countLabel">{label}</span>
                <span className="countValue">{counts[idx] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="hint">Public decryption works only after the on-chain request.</div>
    </div>
  );
}
