export { };

declare global {
    interface Window {
        scanDirectory: (path: string) => Promise<any>;
        sendNotification: (title: string, body: string) => Promise<boolean>;
        saveImage: (url: string, courseId: string) => Promise<string>;
        proxyRequest: (url: string, options: { method: string, headers: Record<string, string>, body?: string | any }) => Promise<{ ok: boolean, status: number, statusText: string, data: any, error?: string }>;
    }
    var puter: any;
}
