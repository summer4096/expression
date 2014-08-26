var Expression = require('./expression');

console.log( (new Expression('testExpression', '2 + 4')).run().format() );
console.log( (new Expression('testExpression', '4 * 5')).run().format() );
console.log( (new Expression('testExpression', '10 - 4')).run().format() );
console.log( (new Expression('testExpression', '-12 + 13')).run().format() );
console.log( (new Expression('testExpression', '2.5 / 5')).run().format() );
console.log( (new Expression('testExpression', '2^8')).run().format() );
console.log( (new Expression('testExpression', '2 feet - 2 inches')).run().format() );
console.log( (new Expression('testExpression', '2 feet * 6 inches')).run().format() );
console.log( (new Expression('testExpression', '500 feet^2 / 2')).run().format() );

//console.log( (new Expression('testExpression', '2 feet in inches')).run().format() );