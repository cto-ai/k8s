// TODO fix these
import { sdk, ux } from '@cto.ai/sdk'
import { assert } from 'chai'
import sinon from 'sinon'
import { continuePrompt, deployPrompts, hpaPrompts } from '../src/prompts'
import { Deployer, DeployerConfig } from '../src/utils'

const EMPTY_CONFIG_KEY = 'test-empty-app-config'
const HPA_CONFIG_KEY = 'test-app-with-hpa-config'
const NO_HPA_CONFIG_KEY = 'test-app-without-hpa-config'

describe('Deployer', () => {
  describe('.updateOrCreate()', () => {
    let emptyAppConfig
    let appConfigWithHPA
    let appConfigNoHPA
    let promptStub
    beforeEach(async () => {
      promptStub = sinon.stub(ux, 'prompt')

      appConfigWithHPA = {
        name: 'app1',
        image: 'image-1',
        port: 8080,
        targetPort: 80,
        replicas: 2,
        isPublic: true,
        host: 'car.sandbox.hc.ai',
        configureHPA: true,
        hpa: {
          minPods: 1,
          maxPods: 3,
          targetCPU: 60,
        }
      }

      appConfigNoHPA = {
        name: 'app2',
        image: 'image-2',
        port: 3000,
        targetPort: 3000,
        replicas: 1,
        isPublic: true,
        host: 'car.sandbox.hc.ai',
        configureHPA: false,
      }

      // await sdk.setConfig(EMPTY_CONFIG_KEY, { region: 'us-west-2', apps: {} })
      // await sdk.setConfig(HPA_CONFIG_KEY, {
      //   region: 'us-west-2',
      //   apps: { app1: appConfigWithHPA }
      // })
      // await sdk.setConfig(NO_HPA_CONFIG_KEY, {
      //   region: 'us-west-2',
      //   apps: { app2: appConfigNoHPA }
      // })
    })

    afterEach(async () => {
      // await sdk.setConfig(EMPTY_CONFIG_KEY, null)
      // await sdk.setConfig(HPA_CONFIG_KEY, null)
      // await sdk.setConfig(NO_HPA_CONFIG_KEY, null)
      promptStub.restore()
    })

    it('Prompt user for deploy configs if app configs do not exist', async () => {
      const prompt = promptStub.withArgs(deployPrompts)
      const contPrompt = promptStub.withArgs(continuePrompt)
      const deployConfig = new DeployerConfig({ key: EMPTY_CONFIG_KEY, type: 'deployer' })
      await Deployer.updateOrCreate({ type: 'deploy', appConfigs: null, deployConfig })

      assert.equal(prompt.called, true)
      assert.equal(contPrompt.called, false)
    })

    it('Prompt user to use existing deploy configs if app configs are NOT empty', async () => {
      const prompt = promptStub.withArgs(deployPrompts)
      const contPrompt = promptStub.withArgs(continuePrompt).returns({ continue: true })
      const deployConfig = new DeployerConfig({ key: HPA_CONFIG_KEY, type: 'deployer' })
      await Deployer.updateOrCreate({ type: 'deploy', appConfigs: appConfigWithHPA, deployConfig })

      assert.equal(contPrompt.called, true)
      assert.equal(prompt.called, false)
    })

    it('Prompts user to update deploy configs if app configs are NOT empty but user wants to update current configs', async () => {
      const prompt = promptStub.withArgs(deployPrompts)
      const contPrompt = promptStub.withArgs(continuePrompt).returns({ continue: false })
      const deployConfig = new DeployerConfig({ key: HPA_CONFIG_KEY, type: 'deployer' })
      await Deployer.updateOrCreate({ type: 'deploy', appConfigs: appConfigWithHPA, deployConfig })

      assert.equal(contPrompt.called, true)
      assert.equal(prompt.called, true)
    })

    it('Prompt user for HPA configs if HPA configs do not exist', async () => {
      const prompt = promptStub.withArgs(hpaPrompts)
      const contPrompt = promptStub.withArgs(continuePrompt)
      const deployConfig = new DeployerConfig({ key: NO_HPA_CONFIG_KEY, type: 'hpa' })
      await Deployer.updateOrCreate({ type: 'hpa', appConfigs: appConfigNoHPA, deployConfig })

      assert.equal(prompt.called, true)
      assert.equal(contPrompt.called, false)
    })

    it('Prompt user to use existing HPA configs if HPA configs are NOT empty', async () => {
      const prompt = promptStub.withArgs(hpaPrompts)
      const contPrompt = promptStub.withArgs(continuePrompt).returns({ continue: true })
      const deployConfig = new DeployerConfig({ key: HPA_CONFIG_KEY, type: 'hpa' })
      await Deployer.updateOrCreate({ type: 'hpa', appConfigs: appConfigWithHPA, deployConfig })

      assert.equal(prompt.called, false)
      assert.equal(contPrompt.called, true)
    })

    it('Prompts user to update deploy configs if app configs are NOT empty but user wants to update current configs', async () => {
      const prompt = promptStub.withArgs(hpaPrompts)
      const contPrompt = promptStub.withArgs(continuePrompt).returns({ continue: false })
      const deployConfig = new DeployerConfig({ key: HPA_CONFIG_KEY, type: 'hpa' })
      await Deployer.updateOrCreate({ type: 'hpa', appConfigs: appConfigWithHPA, deployConfig })

      assert.equal(prompt.called, true)
      assert.equal(contPrompt.called, true)
    })
  })
})
