declare module 'regression' {
  interface RegressionResult {
    r2: number;
    predict(x: number): [number, number];
  }

  interface RegressionStatic {
    linear(data: [number, number][], options?: object): RegressionResult;
    exponential(data: [number, number][], options?: object): RegressionResult;
    logarithmic(data: [number, number][], options?: object): RegressionResult;
    power(data: [number, number][], options?: object): RegressionResult;
    polynomial(data: [number, number][], options?: object): RegressionResult;
  }

  const regression: RegressionStatic;
  export default regression;
}
