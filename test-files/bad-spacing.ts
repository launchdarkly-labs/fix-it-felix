interface TestInterface{
name:string;
value :number;
}

class BadClass implements TestInterface{
name="test";
value= 42;

constructor(name: string,value:number) {
this.name=name;
this.value =value;
}

public   getBadMethod( ):string{
return`${this.name}: ${this.value}`;
}
}

const instance=new BadClass("test",123);
console.log(instance.getBadMethod())