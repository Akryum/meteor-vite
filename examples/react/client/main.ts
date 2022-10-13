import 'meteor/test:lazy'
import { Cookies } from 'meteor/ostrio:cookies'

const cookies = new Cookies()
console.log('(meteor) cookies', cookies.get('meteor_login_token'))
