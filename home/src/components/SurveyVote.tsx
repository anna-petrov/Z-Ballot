import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract } from 'ethers';
import { isAddress } from 'viem';

import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { SURVEY_QUESTIONS } from '../config/survey';
import { SURVEY_CONTRACT_ABI } from '../config/contracts';
import '../styles/SurveyVote.css';

function isReadyContractAddress(address: string): address is `0x${string}` {
  return isAddress(address);
}

export function SurveyVote({ contractAddress }: { contractAddress: string }) {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [answers, setAnswers] = useState<number[]>(() => SURVEY_QUESTIONS.map(() => -1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  const canQuery = isReadyContractAddress(contractAddress) && !!address;

  const { data: hasSubmitted } = useReadContract({
    address: canQuery ? contractAddress : undefined,
    abi: SURVEY_CONTRACT_ABI,
    functionName: 'hasSubmitted',
    args: address ? [address] : undefined,
    query: { enabled: canQuery },
  });

  const allAnswered = useMemo(() => answers.every((a) => a >= 0), [answers]);
  const canSubmit =
    isConnected &&
    allAnswered &&
    !zamaLoading &&
    !zamaError &&
    !!instance &&
    !!signerPromise &&
    isReadyContractAddress(contractAddress) &&
    hasSubmitted !== true;

  const onChangeAnswer = (questionId: number, optionId: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionId] = optionId;
      return next;
    });
  };

  const submit = async () => {
    setSubmitError('');
    setTxHash('');

    if (!canSubmit || !address || !instance || !signerPromise) return;

    setIsSubmitting(true);
    try {
      const input = instance.createEncryptedInput(contractAddress, address);
      for (const choice of answers) input.add8(BigInt(choice));
      const encrypted = await input.encrypt();

      const signer = await signerPromise;
      const contract = new Contract(contractAddress, SURVEY_CONTRACT_ABI, signer);

      const tx = await contract.submitSurvey(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.handles[3],
        encrypted.handles[4],
        encrypted.inputProof,
      );
      setTxHash(tx.hash);
      await tx.wait();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReadyContractAddress(contractAddress)) {
    return (
      <div className="vote">
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
    <div className="vote">
      {zamaError && (
        <div className="errorBox">
          <div className="errorTitle">Encryption service unavailable</div>
          <div className="errorBody">{zamaError}</div>
        </div>
      )}

      {hasSubmitted === true && (
        <div className="successBox">
          <div className="successTitle">Vote already submitted</div>
          <div className="successBody">You can still view results and request a single question to be made public.</div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {SURVEY_QUESTIONS.map((q) => (
          <fieldset key={q.id} className="question">
            <legend className="questionTitle">
              {q.id + 1}. {q.title}
            </legend>
            <div className="options">
              {q.options.map((label, optionId) => (
                <label key={optionId} className={`option ${answers[q.id] === optionId ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={optionId}
                    checked={answers[q.id] === optionId}
                    onChange={() => onChangeAnswer(q.id, optionId)}
                    disabled={!isConnected || hasSubmitted === true || isSubmitting}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {submitError && (
          <div className="errorBox">
            <div className="errorTitle">Submission failed</div>
            <div className="errorBody">{submitError}</div>
          </div>
        )}

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

        <button type="submit" className="primaryButton" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? 'Submitting encrypted vote…' : 'Submit encrypted vote'}
        </button>
        <div className="hint">Writes use ethers; reads use viem.</div>
      </form>
    </div>
  );
}
