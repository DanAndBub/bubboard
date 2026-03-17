declare module 'regression' {
  interface Result {
    equation: number[];
    r2: number;
    predict(x: number): [number, number];
    points: [number, number][];
    string: string;
  }
  type RegressionFn = (data: [number, number][], options?: { precision?: number }) => Result;

  const regression: { linear: RegressionFn; exponential: RegressionFn };
  export default regression;
}
