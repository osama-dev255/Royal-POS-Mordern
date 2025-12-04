declare module 'quagga' {
  interface QuaggaJSConfigObject {
    inputStream?: {
      name?: string;
      type?: string;
      target?: HTMLElement | string;
      constraints?: MediaTrackConstraints;
    };
    decoder?: {
      readers?: string[];
    };
  }

  interface QuaggaJSResultObject {
    codeResult: {
      code: string;
      format: string;
    };
  }

  interface QuaggaJSStatic {
    init(
      config: QuaggaJSConfigObject,
      callback: (err: any) => void
    ): void;
    start(): void;
    stop(): void;
    onDetected(callback: (data: QuaggaJSResultObject) => void): void;
  }

  const Quagga: QuaggaJSStatic;
  export default Quagga;
}