/** The largest connected opaque component is the actor; neighboring weapons may spill across a generated cell edge. */
export function actorBounds(data:Uint8ClampedArray,width:number,height:number,columns=4,rows=2){
 const bounds:number[][]=[];
 const visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
 for(let cell=0;cell<columns*rows;cell++){
  const left=Math.floor(cell%columns*width/columns),right=Math.floor((cell%columns+1)*width/columns),top=Math.floor(Math.floor(cell/columns)*height/rows),bottom=Math.floor((Math.floor(cell/columns)+1)*height/rows);
  let largest=0,best=[left,top,right-left,bottom-top];
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
   const start=y*width+x;if(visited[start]||data[start*4+3]<=120)continue;
   let head=0,tail=1,l=x,r=x,t=y,b=y;queue[0]=start;visited[start]=1;
   while(head<tail){const pos=queue[head++],cx=pos%width,cy=Math.floor(pos/width);l=Math.min(l,cx);r=Math.max(r,cx);t=Math.min(t,cy);b=Math.max(b,cy);
    for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]])if(nx>=left&&nx<right&&ny>=top&&ny<bottom){const n=ny*width+nx;if(!visited[n]&&data[n*4+3]>120){visited[n]=1;queue[tail++]=n;}}
   }
   if(tail>largest){largest=tail;best=[l,t,r-l+1,b-t+1];}
  }
  bounds.push(best);
 }
 return bounds;
}

/** Single isolated sprite: one linear alpha scan, without sprite-sheet component search. */
export function isolatedBounds(data:Uint8ClampedArray,width:number,height:number):[number,number,number,number]{
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>120){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return right<0?[0,0,width,height]:[left,top,right-left+1,bottom-top+1];
}
