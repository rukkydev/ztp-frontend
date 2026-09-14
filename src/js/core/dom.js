// Single import point for jQuery. Import `$` from here everywhere else
// in the app instead of importing 'jquery' directly — keeps upgrades
// and any future no-jQuery migration to a single file.
import jQuery from 'jquery'

const $ = jQuery
export default $
