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

  return badly_formatted
}

function trailing_spaces() {
  const result = 'test'
  return result
}

// Missing semicolon will be added by prettier
const missing_semi = 'test'
