import { task } from 'hardhat/config';
import { DRE, impersonateAccountHardhat } from '../../helpers/misc-utils';
import { ZERO_ADDRESS } from '../../helpers/constants';
import { aaveMarketAddresses } from '../../helpers/aave-v2-addresses';
import { getAToken, getAaveProtocolDataProvider } from '../../helpers/contract-getters';
import { AnteiStableDollarEntities } from '../../../types/src/contracts/antei/';
import { asdEntityConfig } from '../../configs//asd-configuration';

task('add-asd-as-entity', 'Set oracle for asd in Aave Oracle').setAction(async (_, hre) => {
  await hre.run('set-DRE');
  const { ethers } = DRE;

  let asd = await ethers.getContract('AnteiStableDollarEntities');

  const aaveDataProvider = await getAaveProtocolDataProvider(
    aaveMarketAddresses.aaveProtocolDataProvider
  );

  const tokenProxyAddresses = await aaveDataProvider.getReserveTokensAddresses(asd.address);
  const aToken = await getAToken(tokenProxyAddresses.aTokenAddress);

  const governanceSigner = await impersonateAccountHardhat(aaveMarketAddresses.shortExecutor);
  asd = await asd.connect(governanceSigner);

  const aaveEntity: AnteiStableDollarEntities.InputEntityStruct = {
    label: asdEntityConfig.label,
    entityAddress: asdEntityConfig.entityAddress,
    mintLimit: asdEntityConfig.mintLimit,
    minters: [aToken.address],
    burners: [aToken.address],
    active: true,
  };

  const addEntityTx = await asd.addEntities([aaveEntity]);
  const addEntityTxReceipt = await addEntityTx.wait();

  let error = false;
  if (addEntityTxReceipt && addEntityTxReceipt.events) {
    const newEntityEvents = addEntityTxReceipt.events.filter((e) => e.event === 'EntityCreated');
    if (newEntityEvents.length > 0) {
      console.log(`New Entity Added with ID ${newEntityEvents.id}`);
    } else {
      error = true;
    }
    error = true;
  }
  if (error) {
    console.log(`ERROR: Aave not added as ASD entity`);
  }
});