export const SURVEY_CONTRACT_ADDRESS = '0xDb3133C0B4d5694DA7EBc5b57a72253D3Ab2aE41';

export const SURVEY_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'uint8', name: 'questionId', type: 'uint8' },
      { internalType: 'address', name: 'requester', type: 'address', indexed: true },
    ],
    name: 'QuestionResultsMadePublic',
    type: 'event',
    anonymous: false,
  },
  {
    inputs: [{ internalType: 'address', name: 'voter', type: 'address', indexed: true }],
    name: 'SurveySubmitted',
    type: 'event',
    anonymous: false,
  },
  {
    inputs: [],
    name: 'QUESTION_COUNT',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_OPTIONS',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'questionId', type: 'uint8' }],
    name: 'optionCount',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'hasSubmitted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSubmissions',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'questionId', type: 'uint8' }],
    name: 'getEncryptedCounts',
    outputs: [{ internalType: 'euint32[4]', name: '', type: 'bytes32[4]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'questionId', type: 'uint8' }],
    name: 'makeQuestionResultsPublic',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'externalEuint8', name: 'q0', type: 'bytes32' },
      { internalType: 'externalEuint8', name: 'q1', type: 'bytes32' },
      { internalType: 'externalEuint8', name: 'q2', type: 'bytes32' },
      { internalType: 'externalEuint8', name: 'q3', type: 'bytes32' },
      { internalType: 'externalEuint8', name: 'q4', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'submitSurvey',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

