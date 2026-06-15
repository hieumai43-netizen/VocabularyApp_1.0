let words=[];
let index=0;
let mode="normal";


fetch("data.json")

.then(r=>r.json())

.then(data=>{

words=data;

index=Number(
localStorage.getItem("index") || 0
);


show();

});




function show(){


let w=words[index];


document.getElementById("number").innerHTML =
(index+1)+" / "+words.length;


document.getElementById("mainWord").innerHTML =
w.jp;


document.getElementById("kana").innerHTML =
w.kana;


document.getElementById("vn").innerHTML =
w.vn;


document.getElementById("jp").innerHTML =
w.jp;


document.getElementById("en").innerHTML =
w.en;


document.getElementById("cn").innerHTML =
w.cn;


document.getElementById("exJP").innerHTML =
w.exampleJP;


document.getElementById("exVN").innerHTML =
w.exampleVN;


document.getElementById("count").innerHTML =
(index+1)+" / "+words.length;



document.getElementById("bar").style.width =
((index+1)/words.length*100)+"%";


}





function next(){


if(mode=="random"){

index=Math.floor(Math.random()*words.length);

}else{

index++;

if(index>=words.length)
index=0;

}


save();

show();

}



function back(){

index--;

if(index<0)
index=words.length-1;


save();

show();

}




function save(){

localStorage.setItem(
"index",
index
);

}





function changeLang(){

alert(
"Demo: sau sẽ đổi ngôn ngữ chính"
);

}



function openCategory(){

document.getElementById(
"categoryBox"
).style.display="block";

}



function openOption(){

document.getElementById(
"optionBox"
).style.display="block";

}



function closePopup(){

document.querySelectorAll(
".popup"
)
.forEach(x=>x.style.display="none");

}