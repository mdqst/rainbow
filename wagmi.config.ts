import { defineConfig } from '@wagmi/cli'
import { etherscan, react } from "@wagmi/cli/plugins";




export default defineConfig({
  out: 'src/generated.ts',
  contracts: [],
  plugins: [
    etherscan({
      apiKey: 'A8EIEGG7EVRK1WITUQBRHRA71FFGXUPPGB',
      chainId: 1,
      contracts: [{

          name: 'zoraNFTCreator',
          address: { [1]: '0xa6a2956fa075d50b021385478A99f3642dAfCc2C' },
          
      }],
    }),
    react(),
  ],
})
