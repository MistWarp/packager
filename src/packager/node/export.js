import Packager from '@packager/packager/packager';
import {downloadProject} from '@packager/packager/download-project';
import NodeAdapter from './adapter';
import Image from './image';
import {setAdapter} from '@packager/packager/adapter';

setAdapter(new NodeAdapter());

export {
  Packager,
  Image,
  downloadProject as loadProject
};
