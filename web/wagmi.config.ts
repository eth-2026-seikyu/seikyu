import { defineConfig } from '@wagmi/cli';
import { foundry } from '@wagmi/cli/plugins';

export default defineConfig({
  out: 'lib/generated.ts',
  plugins: [
    foundry({
      project: '../contracts',
      artifacts: 'out',
      include: [
        'InvoiceMarket.sol/InvoiceMarket.json',
        'InvoiceRegistrar.sol/InvoiceRegistrar.json',
        'MockUSDC.sol/MockUSDC.json',
        'IUserRegistry.sol/IUserRegistry.json',
        'IPermissionedResolver.sol/IPermissionedResolver.json',
      ],
      forge: {
        build: false,
      },
    }),
  ],
});
