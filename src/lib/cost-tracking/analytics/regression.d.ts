declare module 'regression' {
  interface Result {
    equation: number[];
    r2: number;
    predict(x: number): [number, number];
    points: [number, number][];
    string: string;
  }
  function linear(data: [number, number][], options?: { precision?: number }): Result;
  function exponential(data: [number, number][], options?: { precision?: number }): Result;
  export default { linear, exponential };

  const regression: { linear: typeof linear; exponential: typeof exponential };
  export default regression;
}
