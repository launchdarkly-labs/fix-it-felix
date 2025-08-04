// File specifically for CI testing - has intentional formatting issues
const testFunction = function (param1, param2, param3) {
  var unused = 'this will trigger linting warnings'
  let badFormat = {
    prop1: 1,
    prop2: 2,
    prop3: 3,
    prop4: 4
  }

  if (param1 === param2) {
    console.log('intentionally bad formatting for CI tests')
  }

  function spacingIssues() {
    return badFormat
  }

  return badFormat
}

// Missing semicolon for testing
const testVar = 'intentionally formatted poorly'
// test change for path testing
