declare module "vue3-sfc-loader" {
  const loader: any;
  export = loader;
}

declare global {
  interface Window {
    $message?: any;
    $dialog?: any;
    $routerPush?: { routerPush: (url: string) => void };
  }
}

export {};
