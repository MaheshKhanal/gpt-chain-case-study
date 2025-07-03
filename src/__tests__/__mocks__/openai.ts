const mockCreate = jest.fn();

const MockOpenAI = jest.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));

export default MockOpenAI;
export { mockCreate }; 