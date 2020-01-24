export function proxyEnvFromProperties(allProperties: Array<string>): Map<string, string> {

    const proxies = new Map<string, string>()
    let regexpHost: RegExp = new RegExp('-D(http|https|ftp)\.proxyHost=([^\\s]+)')
    allProperties.forEach(p => {
        const match = regexpHost.exec(p)
        if (match != null && match.length == 3) {
            const proxyType = match[1]
            const proxyHost = match[2]
            const regexpPort: RegExp = new RegExp(`-D${proxyType}.proxyPort=(\\d+)`)
            const port = allProperties.find(p => {
                return regexpPort.test(p)
            })
            const envVarName = `${proxyType}_proxy`
            if (port) {
                const portMatch = regexpPort.exec(port)
                if (portMatch && portMatch.length == 2) {
                    proxies.set(envVarName, `${proxyHost}:${portMatch[1]}`)
                } else {
                    proxies.set(envVarName, proxyHost)
                }
            } else {
                proxies.set(envVarName, proxyHost)
            }
        }
    })

    return proxies
}