import 'meteor/test:lazy'
import { Cookies } from 'meteor/ostrio:cookies'
import { useTracker } from "meteor/react-meteor-data";

console.log({useTracker});

const cookies = new Cookies()
console.log('(meteor) cookies', cookies.get('meteor_login_token'))
