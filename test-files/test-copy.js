// Test file with intentional formatting issues
const badFunction = function (param1, param2, param3) {
  var unused = 'this variable is unused'
  let badly_formatted = {
    a: 1,
    b: 2,
    c: 3,
    d: 4
  }

  if (param1 === param2) {
    console.log('Double quotes and bad spacing')
  }

  function trailing_spaces() {
    return badly_formatted
  }

  return badly_formatted
}

const missing_semi = 'test'
