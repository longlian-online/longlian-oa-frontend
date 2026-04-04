declare const __APP_VERSION__: string
declare const __APP_NAME__: string
interface ImportMetaEnv {
    readonly VITE_RUM_TOKEN: string
    readonly VITE_RUM_ENABLE: number
    readonly VITE_RUM_SITE: string
    readonly VITE_RUM_ORG: string
}