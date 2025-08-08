import { 
  SystemThemeDetector,
  getSystemThemeDetector,
  useSystemThemeDetection
} from '../systemThemeDetector';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

describe('systemThemeDetector', () => {
  let mockMediaQueryList: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMediaQueryList = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);
  });

  describe('SystemThemeDetector', () => {
    let detector: SystemThemeDetector;

    beforeEach(() => {
      detector = new SystemThemeDetector();
    });

    afterEach(() => {
      detector.destroy();
    });

    it('should initialize with media queries', () => {
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: light)');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-contrast: high)');
    });

    it('should get current theme info', () => {
      mockMediaQueryList.matches = true;
      
      const themeInfo = detector.getCurrentThemeInfo();
      
      expect(themeInfo).toHaveProperty('prefersDark');
      expect(themeInfo).toHaveProperty('prefersLight');
      expect(themeInfo).toHaveProperty('prefersReducedMotion');
      expect(themeInfo).toHaveProperty('prefersHighContrast');
      expect(themeInfo).toHaveProperty('colorScheme');
    });

    it('should detect dark theme preference', () => {
      // Mock dark theme preference
      mockMatchMedia.mockImplementation((query) => {
        if (query === '(prefers-color-scheme: dark)') {
          return { ...mockMediaQueryList, matches: true };
        }
        return { ...mockMediaQueryList, matches: false };
      });
      
      detector = new SystemThemeDetector();
      const themeInfo = detector.getCurrentThemeInfo();
      
      expect(themeInfo.prefersDark).toBe(true);
      expect(themeInfo.colorScheme).toBe('dark');
    });

    it('should detect light theme preference', () => {
      // Mock light theme preference
      mockMatchMedia.mockImplementation((query) => {
        if (query === '(prefers-color-scheme: light)') {
          return { ...mockMediaQueryList, matches: true };
        }
        return { ...mockMediaQueryList, matches: false };
      });
      
      detector = new SystemThemeDetector();
      const themeInfo = detector.getCurrentThemeInfo();
      
      expect(themeInfo.prefersLight).toBe(true);
      expect(themeInfo.colorScheme).toBe('light');
    });

    it('should add and remove listeners', () => {
      const mockCallback = jest.fn();
      
      detector.addListener('test-listener', mockCallback);
      
      // Should add listeners to all media queries
      expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(4);
      
      detector.removeListener('test-listener');
      
      // Should remove listeners from all media queries
      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledTimes(4);
    });

    it('should call listener on theme change', () => {
      const mockCallback = jest.fn();
      
      detector.addListener('test-listener', mockCallback);
      
      // Simulate theme change
      const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1];
      changeHandler();
      
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        prefersDark: expect.any(Boolean),
        prefersLight: expect.any(Boolean),
        colorScheme: expect.any(String)
      }));
    });

    it('should handle window undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const ssrDetector = new SystemThemeDetector();
      const themeInfo = ssrDetector.getCurrentThemeInfo();
      
      expect(themeInfo.prefersDark).toBe(false);
      expect(themeInfo.prefersLight).toBe(true);
      expect(themeInfo.colorScheme).toBe('light');
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('getSystemThemeDetector', () => {
    it('should return singleton instance', () => {
      const detector1 = getSystemThemeDetector();
      const detector2 = getSystemThemeDetector();
      
      expect(detector1).toBe(detector2);
    });
  });

  describe('useSystemThemeDetection', () => {
    // Note: Testing React hooks requires a more complex setup
    // This is a simplified test structure
    it('should be defined', () => {
      expect(useSystemThemeDetection).toBeDefined();
      expect(typeof useSystemThemeDetection).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle matchMedia not supported', () => {
      // @ts-ignore
      delete window.matchMedia;
      
      const detector = new SystemThemeDetector();
      const themeInfo = detector.getCurrentThemeInfo();
      
      expect(themeInfo.prefersDark).toBe(false);
      expect(themeInfo.prefersLight).toBe(true);
      expect(themeInfo.colorScheme).toBe('light');
      
      // Restore for other tests
      window.matchMedia = mockMatchMedia;
    });

    it('should handle matchMedia throwing an error', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia error');
      });
      
      expect(() => new SystemThemeDetector()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should destroy detector and clean up resources', () => {
      const detector = new SystemThemeDetector();
      const mockCallback = jest.fn();
      
      detector.addListener('test', mockCallback);
      detector.destroy();
      
      // Should remove all listeners
      expect(mockMediaQueryList.removeEventListener).toHaveBeenCalled();
    });
  });
});