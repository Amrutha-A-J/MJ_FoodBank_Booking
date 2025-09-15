export const mockCreateObjectURL = jest.fn() as jest.MockedFunction<typeof URL.createObjectURL>;
export const mockRevokeObjectURL = jest.fn() as jest.MockedFunction<typeof URL.revokeObjectURL>;

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL,
});
