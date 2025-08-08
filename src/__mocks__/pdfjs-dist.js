// Mock for pdfjs-dist to avoid ES module issues in tests
module.exports = {
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument: jest.fn().mockImplementation(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getMetadata: () => Promise.resolve({
        info: {}
      }),
      getPage: () => Promise.resolve({
        getTextContent: () => Promise.resolve({
          items: []
        })
      })
    })
  }))
};