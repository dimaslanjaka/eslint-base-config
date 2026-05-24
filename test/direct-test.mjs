import setupModule from './setup.cjs';

setupModule.buildPackage();
setupModule.setup(false).then(() => {
  setupModule.generateEsmConfig();
  setupModule.runEslint(setupModule.writeUglyCodes('ugly-ts', 'ts'), { stdio: 'inherit' });
});
