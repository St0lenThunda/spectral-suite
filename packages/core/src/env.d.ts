declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

declare module '*?worker' {
  const workerConstructor: {
    new(): Worker
  }
  export default workerConstructor
}
