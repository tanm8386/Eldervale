-- Eldervale / original pixel art, authored and exported inside Aseprite.
-- Every shape is placed on an integer pixel grid. No external image inputs.
local root = app.params['root'] or '.'
local out = root .. '/public/assets/'
local source = root .. '/art/source/'
local pc = app.pixelColor
local colors, assets, manifest = {}, {}, {}
local function C(hex, alpha)
  if type(hex) == 'number' then return hex end
  local key = hex .. tostring(alpha or 255)
  if not colors[key] then
    hex = hex:gsub('#','')
    colors[key] = pc.rgba(tonumber(hex:sub(1,2),16),tonumber(hex:sub(3,4),16),tonumber(hex:sub(5,6),16),alpha or 255)
  end
  return colors[key]
end
local function image(w,h) return Image(w,h,ColorMode.RGB) end
local function dot(im,x,y,c)
  x,y=math.floor(x),math.floor(y)
  if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,C(c)) end
end
local function rect(im,x,y,w,h,c)
  for yy=math.max(0,math.floor(y)),math.min(im.height-1,math.floor(y+h-1)) do
    for xx=math.max(0,math.floor(x)),math.min(im.width-1,math.floor(x+w-1)) do im:drawPixel(xx,yy,C(c)) end
  end
end
local function line(im,x0,y0,x1,y1,c,width)
  local n=math.max(math.abs(x1-x0),math.abs(y1-y0),1)
  for i=0,n do rect(im,math.floor(x0+(x1-x0)*i/n),math.floor(y0+(y1-y0)*i/n),width or 1,width or 1,c) end
end
local function ellipse(im,cx,cy,rx,ry,c)
  for y=math.floor(cy-ry),math.ceil(cy+ry) do
    for x=math.floor(cx-rx),math.ceil(cx+rx) do
      if ((x-cx)/rx)^2+((y-cy)/ry)^2<=1 then dot(im,x,y,c) end
    end
  end
end
local function poly(im,points,c)
  local miny,maxy=99999,-99999
  for _,p in ipairs(points) do miny=math.min(miny,p[2]);maxy=math.max(maxy,p[2]) end
  for y=math.floor(miny),math.ceil(maxy) do
    local cuts={}
    for i,p in ipairs(points) do
      local q=points[i%#points+1]
      if (p[2]<=y and q[2]>y) or (q[2]<=y and p[2]>y) then cuts[#cuts+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2]) end
    end
    table.sort(cuts)
    for i=1,#cuts-1,2 do line(im,math.ceil(cuts[i]),y,math.floor(cuts[i+1]),y,c) end
  end
end
local function rng(seed)
  local a=seed
  return function(n) a=(a*1664525+1013904223)%4294967296; return n and math.floor(a/4294967296*n) or a/4294967296 end
end
local function stamp(dst,src,x,y,scale,flip)
  scale=scale or 1
  for yy=0,src.height-1 do for xx=0,src.width-1 do
    local color=src:getPixel(xx,yy)
    if pc.rgbaA(color)>0 then rect(dst,x+(flip and (src.width-1-xx) or xx)*scale,y+yy*scale,scale,scale,color) end
  end end
end
local function save(name,frames,w,h,columns,tags)
  if type(frames)=='userdata' then frames={frames} end
  columns=columns or #frames
  local sheet=image(w*columns,h*math.ceil(#frames/columns))
  local spr=Sprite(w,h,ColorMode.RGB)
  spr.layers[1].name='Hand-painted pixels'
  for f,im in ipairs(frames) do
    if f>1 then spr:newEmptyFrame() end
    spr:newCel(spr.layers[1],spr.frames[f],im,Point(0,0))
    spr.frames[f].duration=0.12
    stamp(sheet,im,((f-1)%columns)*w,math.floor((f-1)/columns)*h)
  end
  if tags then for _,t in ipairs(tags) do local tag=spr:newTag(t[2],t[3]);tag.name=t[1] end end
  spr:saveAs(source..name..'.aseprite')
  sheet:saveAs(out..name..'.png')
  spr:close()
  assets[name]=frames
  manifest[#manifest+1]='"'..name..'":{"w":'..w..',"h":'..h..',"frames":'..#frames..',"columns":'..columns..'}'
  print('Painted '..name..' ('..#frames..' frames)')
end
local P={ink='#233d36',dark='#254737',shade='#36593c',green='#527b45',leaf='#72944f',light='#9aac64',gold='#dfc181',cream='#efe0b6',wood='#725340',woodLight='#a17a50',stone='#889383',stoneDark='#596e64',water='#397b82'}

-- Terrain: soft clustered grass, hand-laid paths and four water phases.
local terrain=image(256,96)
for v=0,15 do
  local r=rng(210+v)
  rect(terrain,v*16,0,16,16,v%3==0 and '#5b804c' or '#587d49')
  for i=1,9 do local x,y=v*16+r(15),r(15); rect(terrain,x,y,2+r(3),1,r(3)==0 and '#648850' or '#527748') end
  for i=1,3 do local x,y=v*16+r(15),r(14);dot(terrain,x,y,'#709454');dot(terrain,x+1,y+1,'#65894e') end
  rect(terrain,v*16,16,16,16,'#b7a177')
  for i=1,12 do local x,y=v*16+r(15),16+r(16);rect(terrain,x,y,1+r(3),1,i%3==0 and '#c2ae84' or '#ae9970') end
  if v%3==0 then rect(terrain,v*16+4,22,4,2,'#9b8e6c');rect(terrain,v*16+4,21,3,1,'#cab791') end
  for f=0,3 do
    local y=32+f*16
    rect(terrain,v*16,y,16,16,'#34747a')
    for i=1,4 do local xx=(i*5+v*3+f*2)%15;line(terrain,v*16+xx,y+(i*4+v)%15,v*16+math.min(15,xx+3),y+(i*4+v)%15,i%2==0 and '#43868a' or '#2e6d73') end
    if v%4==0 then line(terrain,v*16+2+f,y+7,v*16+7+f,y+7,'#6ba5a0');dot(terrain,v*16+1+f,y+8,'#4e9190') end
  end
end
save('terrain',terrain,256,96)

local pathEdges=image(256,16)
for mask=0,15 do
  local r=rng(mask+61)
  for y=0,15 do for x=0,15 do
    local show=((mask&1)>0 or y>2+(x%5==0 and 1 or 0)) and ((mask&2)>0 or x<13-(y%5==1 and 1 or 0)) and ((mask&4)>0 or y<13-(x%4==2 and 1 or 0)) and ((mask&8)>0 or x>2+(y%5==0 and 1 or 0))
    if show then dot(pathEdges,mask*16+x,y,r(16)==0 and '#c4ae82' or '#b7a177') end
  end end
end
save('path-edges',pathEdges,256,16)
local bridge=image(16,16)
rect(bridge,0,0,16,16,'#68553b')
for y=0,15,4 do rect(bridge,0,y,16,3,'#b18d58');line(bridge,0,y,15,y,'#cab078');dot(bridge,2,y+1,'#655039');dot(bridge,13,y+1,'#655039') end
save('bridge',bridge,16,16)

-- Trees use broad, carefully nested leaf clusters, with light from upper left.
for variant=0,2 do
  local im=image(64,88)
  local gold=variant==1
  local shades=gold and {'#3b5136','#69723f','#8b8c49','#b0a257','#c5b369'} or {'#203e34','#2d553b','#416d42','#5a8549','#7b9c54'}
  ellipse(im,32,82,22,4,C('#263f32',65))
  poly(im,{{26,82},{29,51},{37,49},{38,77},{47,83},{37,81},{34,76},{30,82},{19,84}},P.wood)
  line(im,31,77,32,47,'#a18051',2);line(im,36,75,35,55,'#493e30',2)
  line(im,30,64,17,49,P.wood,3);line(im,36,63,48,45,P.wood,3)
  if variant==2 then
    for tier=0,3 do
      local top=5+tier*12
      local half=12+tier*4
      poly(im,{{32,top},{32-half,top+28},{22,top+25},{20,top+29},{44,top+29},{42,top+25},{32+half,top+28}},shades[1])
      poly(im,{{31,top+2},{34-half,top+23},{31,top+20},{34,top+25},{28+half,top+23}},shades[3])
      poly(im,{{30,top+5},{37-half,top+22},{31,top+18}},shades[4])
      line(im,30-half+6,top+24,24,top+21,shades[2])
    end
  else
    local clusters={{22,32,18,20},{39,27,18,22},{17,47,16,17},{42,45,19,21},{30,53,20,15},{29,16,15,12},{10,36,9,13},{51,32,11,15}}
    for _,v in ipairs(clusters) do ellipse(im,v[1],v[2],v[3],v[4],shades[1]) end
    for i,v in ipairs(clusters) do
      ellipse(im,v[1]-1,v[2]-3,v[3]-2,v[4]-4,shades[2])
      ellipse(im,v[1]-2,v[2]-5,v[3]-4,v[4]-6,shades[3])
      poly(im,{{v[1]-v[3]+5,v[2]-4},{v[1]-6,v[2]-v[4]+3},{v[1]+3,v[2]-v[4]+3},{v[1]+5,v[2]-7},{v[1]-3,v[2]-9}},shades[4])
    end
    local r=rng(620+variant)
    for i=1,145 do
      local x,y=r(60)+2,r(62)+5
      local c=im:getPixel(x,y)
      if c==C(shades[3]) or c==C(shades[4]) then
        local shade=i%4==0 and shades[5] or shades[4]
        line(im,x,y,x+2,y,shade);dot(im,x+1,y-1,shade)
      end
    end
    line(im,8,51,13,54,shades[3]);line(im,43,60,49,55,shades[3])
  end
  save(variant==0 and 'oak' or variant==1 and 'oak-gold' or 'pine',im,64,88)
end

local bush=image(32,24)
ellipse(bush,16,20,14,3,C(P.ink,65))
ellipse(bush,11,13,9,8,P.dark);ellipse(bush,21,12,9,10,P.dark)
ellipse(bush,11,11,7,6,P.green);ellipse(bush,20,10,8,7,P.green)
ellipse(bush,18,7,5,3,P.leaf);line(bush,5,10,11,7,P.leaf,2)
for _,p in ipairs({{6,13},{22,12},{17,16},{26,10}}) do dot(bush,p[1],p[2],'#bd7c5e');dot(bush,p[1]+1,p[2],'#e0a06e') end
save('bush',bush,32,24)
local rock=image(32,24)
ellipse(rock,16,21,14,2,C(P.ink,65))
poly(rock,{{3,19},{6,10},{15,5},{24,7},{29,15},{27,21},{9,22}},'#53675a')
poly(rock,{{5,17},{8,11},{16,7},{23,8},{26,15},{19,19},{10,19}},'#889183')
poly(rock,{{8,11},{16,7},{23,8},{18,13},{10,14}},'#b2b29a')
line(rock,19,14,24,18,'#6c7c6b');rect(rock,7,19,9,2,P.green);rect(rock,8,18,5,1,P.leaf)
save('rock',rock,32,24)

for kind=0,4 do
  local im=image(16,16)
  if kind==0 then
    for _,p in ipairs({{3,12,2,8},{7,13,6,6},{9,13,11,8},{12,14,14,10}}) do line(im,p[1],p[2],p[3],p[4],'#3e673e');dot(im,p[3],p[4],'#789b56') end
  elseif kind==1 then
    for i=0,2 do local x,y=3+i*5,8+(i%2)*3;line(im,x,y+5,x,y,'#3a633c');rect(im,x-1,y-1,3,3,i%2==0 and '#e8c579' or '#d8c8af');dot(im,x,y,'#bc914f');dot(im,x+2,y+3,'#92a55d') end
  elseif kind==2 then
    line(im,6,12,6,8,'#d2bd95',2);ellipse(im,6,7,5,3,'#884e40');ellipse(im,6,6,4,2,'#c47b52');dot(im,5,5,'#f0d7a3');dot(im,8,6,'#e7c08e');line(im,12,14,12,12,'#cab389');ellipse(im,12,10,3,2,'#b66747')
  elseif kind==3 then
    line(im,8,15,8,4,'#435d3d',2)
    for i=0,2 do poly(im,{{8,11-i*3},{2,8-i*3},{3,5-i*2},{8,8-i*3}},'#8bad85');poly(im,{{9,12-i*3},{15,8-i*3},{13,5-i*2},{9,9-i*3}},'#b7c79c') end
    dot(im,7,2,'#f0ddb2');dot(im,10,1,'#d9e0bf')
  else
    ellipse(im,8,12,6,2,C(P.ink,60));ellipse(im,8,8,5,5,'#73503f');ellipse(im,8,6,5,3,'#a36a49');line(im,4,10,11,10,'#bc8453')
  end
  save(({'grass-tuft','flowers','toadstool','herb','acorn'})[kind+1],im,16,16)
end

local fence=image(16,24)
rect(fence,0,11,16,3,'#735c40');rect(fence,0,10,16,1,'#bc9e67');rect(fence,0,17,16,2,'#816647')
rect(fence,3,4,4,19,'#71593c');rect(fence,3,5,2,16,'#b79864');line(fence,3,3,6,3,'#cfb47c')
save('fence',fence,16,24)
local barrel=image(16,24)
ellipse(barrel,8,21,7,2,C(P.ink,70));rect(barrel,2,5,12,15,P.wood);ellipse(barrel,8,5,6,3,'#b48b57')
for x=3,13,3 do line(barrel,x,8,x,19,'#9b744a') end
rect(barrel,2,8,12,2,'#626e62');rect(barrel,2,17,12,2,'#515f55');line(barrel,4,3,11,3,'#d2ad75');line(barrel,5,5,10,5,'#866445')
save('barrel',barrel,16,24)
local crate=image(24,24)
rect(crate,3,4,18,18,P.wood);rect(crate,5,6,14,14,'#a68251');line(crate,5,7,18,20,'#d1ac6f',2);line(crate,6,20,19,7,'#d1ac6f',2);line(crate,3,4,20,4,'#d9b77d');rect(crate,4,21,18,2,'#4e4b35')
save('crate',crate,24,24)
local bench=image(32,24)
rect(bench,4,10,3,11,'#534936');rect(bench,25,10,3,11,'#534936');rect(bench,2,7,28,4,'#ad8955');rect(bench,2,13,28,5,'#9d794b');line(bench,2,13,29,13,'#d0ae72');line(bench,3,8,28,8,'#c0a16a')
save('bench',bench,32,24)
local sign=image(24,32)
rect(sign,10,12,4,18,P.wood);rect(sign,10,12,1,18,P.woodLight)
poly(sign,{{2,4},{17,4},{22,9},{17,14},{2,14}},P.wood);line(sign,3,4,17,4,'#c29e68');line(sign,5,8,15,8,'#dabd86');line(sign,5,10,12,10,'#b99460')
save('sign',sign,24,32)
local lamp=image(16,48)
rect(lamp,7,17,3,28,'#4a4835');rect(lamp,6,43,6,2,'#746746');line(lamp,7,19,12,13,'#ac945a');rect(lamp,3,8,10,12,P.ink);rect(lamp,5,10,6,8,'#dca763');rect(lamp,7,10,2,8,'#ffe6a3');rect(lamp,2,7,12,2,'#8c7049');poly(lamp,{{3,7},{7,3},{10,3},{13,7}},'#766144');dot(lamp,7,3,'#d9b87b')
save('lamp',lamp,16,48)

local function window(im,x,y,w,h)
  rect(im,x-2,y-2,w+4,h+5,'#6c5640');rect(im,x,y,w,h,'#3e4a3c')
  rect(im,x+1,y+1,w-2,h-2,'#d4a966');rect(im,x+2,y+2,math.max(1,w/2-2),h-4,'#f0d293')
  line(im,x+w/2,y,x+w/2,y+h,'#73583e');line(im,x,y+h/2,x+w,y+h/2,'#73583e')
  rect(im,x-3,y+h+1,w+6,2,'#ba9360');rect(im,x-5,y,3,h,'#75836a');rect(im,x+w+2,y,3,h,'#75836a')
end
local function house(name,w,h,roof)
  local im=image(w,h)
  local left,right,bottom=16,w-17,h-8
  ellipse(im,w/2,h-4,w/2-5,4,C(P.ink,70))
  rect(im,left-1,48,right-left+2,bottom-46,'#514d37')
  rect(im,left,52,right-left,bottom-52,'#c1b38b')
  rect(im,left,55,10,bottom-55,'#a49b76')
  rect(im,right-11,55,11,bottom-55,'#b2a37d')
  rect(im,left,bottom-6,right-left,6,'#7d8370')
  for y=bottom-5,bottom-1,4 do for x=left,right-2,9 do line(im,x+(y%2)*3,y,math.min(right,x+6),y,'#a7a58a') end end
  rect(im,left+2,54,4,bottom-59,'#6f553d');rect(im,right-5,54,4,bottom-59,'#6f553d')
  line(im,left+4,59,left+25,77,'#8f7050',2);line(im,right-4,59,right-25,77,'#8f7050',2)
  rect(im,w/2-3,58,5,bottom-58,'#785a40');rect(im,left,74,right-left,3,'#795b42')
  local dark,mid,light = roof=='slate' and '#40595a' or '#794438',roof=='slate' and '#657d79' or '#b36543',roof=='slate' and '#8da399' or '#d38a57'
  poly(im,{{5,60},{24,20},{w-26,20},{w-5,60},{w-10,66},{10,66}},'#3c4636')
  poly(im,{{8,59},{26,22},{w-27,22},{w-8,59},{w-11,63},{11,63}},mid)
  for y=24,59,5 do
    local inset=math.floor((60-y)*0.46)+8
    line(im,inset,y,w-inset-1,y,light)
    line(im,inset,y+4,w-inset-1,y+4,dark)
    for x=inset+(y%2)*5,w-inset-1,10 do line(im,x,y+1,x-2,y+4,dark) end
  end
  line(im,26,21,w-27,21,light,2);line(im,7,61,w-8,61,dark,3)
  -- A deep little porch and arched oak door.
  local doorY=bottom-29
  rect(im,w/2-10,doorY+3,21,26,'#4f4936');ellipse(im,w/2,doorY+5,10,7,'#4f4936')
  rect(im,w/2-7,doorY+4,15,25,'#916b45');ellipse(im,w/2,doorY+5,7,5,'#99754a')
  for x=w/2-5,w/2+6,4 do line(im,x,doorY+7,x,bottom-2,'#684f39') end
  dot(im,w/2+4,bottom-14,'#e9c786');rect(im,w/2-13,bottom,27,3,'#b6ad8a');rect(im,w/2-15,bottom+3,31,2,'#807f66')
  window(im,left+14,bottom-27,12,16);window(im,right-27,bottom-27,12,16)
  -- Moss and planted flowerboxes soften the edges.
  for _,x in ipairs({left+11,right-32}) do
    rect(im,x,bottom-8,23,4,'#7c6446');line(im,x,bottom-8,x+22,bottom-8,'#b19561')
    for k=0,5 do rect(im,x+2+k*3,bottom-11-k%2,3,3,k%2==0 and '#69864c' or '#8d9f57');dot(im,x+3+k*3,bottom-12,k%2==0 and '#d9ae6b' or '#d4c2a0') end
  end
  rect(im,w-34,12,12,22,'#677367');rect(im,w-35,11,14,4,'#9b9f87');line(im,w-32,16,w-24,16,'#aeb098');line(im,w-32,24,w-24,24,'#aeb098')
  if name=='inn' then
    poly(im,{{w/2-22,50},{w/2,27},{w/2+22,50}},'#493f31')
    poly(im,{{w/2-17,47},{w/2,30},{w/2+17,47}},'#c8b893')
    window(im,w/2-5,38,10,11)
    line(im,w/2-23,50,w/2,26,dark,3);line(im,w/2,26,w/2+23,50,light,3)
    rect(im,w-15,66,2,25,'#624f38');rect(im,w-19,72,14,14,'#967244');rect(im,w-18,73,12,11,'#d1b07a')
    stamp(im,assets.acorn[1],w-19,71,1)
  elseif name=='forge' then
    rect(im,w/2-9,doorY+1,19,29,'#3d4534');rect(im,w/2-6,bottom-15,13,13,'#a95b35');rect(im,w/2-3,bottom-11,7,9,'#e4a551');rect(im,w/2-1,bottom-7,3,5,'#ffdf88')
    rect(im,w-32,7,17,35,'#626e61');rect(im,w-34,5,21,5,'#a3a48b')
    for y=13,36,7 do line(im,w-31,y,w-16,y,'#86907c') end
    rect(im,6,bottom-10,16,4,'#344840');poly(im,{{5,bottom-14},{25,bottom-14},{20,bottom-8},{10,bottom-8}},'#9aab99');rect(im,12,bottom-8,5,7,'#4a6256')
  end
  save(name,im,w,h)
end
house('inn',128,120,'clay')
house('forge',112,104,'slate')
house('cottage',96,96,'clay')

local market=image(80,64)
ellipse(market,40,59,36,4,C(P.ink,60))
rect(market,8,14,4,45,'#695338');rect(market,67,14,4,45,'#695338')
rect(market,10,33,59,25,'#765a3d');rect(market,13,37,53,17,'#a27d4f')
for x=16,65,9 do line(market,x,38,x,54,'#74583a') end
rect(market,7,34,66,4,'#c6a16a')
poly(market,{{4,30},{14,8},{65,8},{77,30}},P.ink)
for x=8,70,10 do
  poly(market,{{x,29},{x+5,10},{math.min(65,x+13),10},{math.min(73,x+9),29}},((x-8)/10)%2==0 and '#b9bf94' or '#5d7a58')
  rect(market,x,29,9,5,((x-8)/10)%2==0 and '#d1cfaa' or '#7a9566');ellipse(market,x+4,33,4,2,((x-8)/10)%2==0 and '#d1cfaa' or '#7a9566')
end
for i=0,5 do ellipse(market,18+i*4,37-(i%2),2,2,i%2==0 and '#c37d52' or '#dccb81') end
stamp(market,assets.herb[1],43,24);stamp(market,assets.barrel[1],60,40)
save('market',market,80,64)

local fountainFrames={}
for f=0,7 do
  local im=image(64,64)
  ellipse(im,32,57,30,5,C(P.ink,65))
  ellipse(im,32,47,29,14,'#465f54');ellipse(im,32,44,29,13,'#a4aa8d');ellipse(im,32,44,24,10,'#536f63');ellipse(im,32,45,22,8,'#43878a')
  ellipse(im,32,45,17,5,'#629b94');ellipse(im,32,45,12,3,'#46858a')
  for i=0,7 do local a=i*math.pi/4;line(im,32+math.cos(a)*25,44+math.sin(a)*10,32+math.cos(a)*28,44+math.sin(a)*12,'#798d78') end
  line(im,9,47,12,51,'#d0c9a4',2);line(im,17,55,27,57,'#c0bd9b');line(im,43,55,50,52,'#bcc09b')
  rect(im,27,24,11,21,'#617c6b');rect(im,28,25,4,18,'#a9b398');ellipse(im,32,25,14,5,'#567569');ellipse(im,32,23,14,5,'#a5b198');ellipse(im,32,23,11,3,'#4d8e8c')
  poly(im,{{28,21},{27,12},{31,5},{35,8},{37,16},{34,21}},'#829e81');line(im,30,15,31,8,'#cfceab',2)
  for _,x in ipairs({22,41}) do line(im,x,26,x+(x<30 and -2 or 2),41,'#8ac2b0');dot(im,x,28+f%4,'#d2e4c5');dot(im,x+(x<30 and -2 or 2),42+f%2,'#b9dac0') end
  for i=0,3 do local x=15+(i*9+f*3)%33;line(im,x,44+(i*3)%8,x+4,44+(i*3)%8,'#a3c8b2') end
  fountainFrames[#fountainFrames+1]=im
end
save('fountain',fountainFrames,64,64,8,{{'flow',1,8}})

local well=image(32,40)
ellipse(well,16,34,14,5,'#4b6658');ellipse(well,16,29,14,6,'#a6aa8b');ellipse(well,16,28,10,4,'#3b5850')
rect(well,4,7,3,24,P.wood);rect(well,25,7,3,24,P.wood);poly(well,{{1,10},{16,1},{31,10}},'#905940');line(well,1,10,31,10,'#c48b59',2);line(well,16,10,16,27,'#c0a576')
save('well',well,32,40)
local column=image(24,48)
ellipse(column,12,45,11,2,C(P.ink,70));rect(column,3,39,19,5,'#6e8270');rect(column,5,13,15,27,'#9ca88b');rect(column,7,14,3,25,'#c0c1a0');rect(column,16,14,3,25,'#738875');rect(column,2,10,21,5,'#b2b899');rect(column,5,7,15,4,'#859983');line(column,15,15,12,23,'#607764');line(column,12,23,16,28,'#607764');rect(column,4,38,6,4,P.green);rect(column,14,9,7,3,P.green)
save('column',column,24,48)
local ruin=image(48,40)
for row=0,3 do for col=0,3 do local x=col*12+(row%2)*-5;local y=33-row*8;if row<2 or (col~=2 and col~=0) then rect(ruin,x,y,11,7,row%2==0 and '#7c8d74' or '#919d81');line(ruin,x+1,y,x+9,y,'#b0b598') end end end
rect(ruin,3,32,18,3,P.green);rect(ruin,29,19,13,3,P.green);save('ruin',ruin,48,40)
local chest=image(24,24)
rect(chest,3,10,18,11,'#6a4f36');ellipse(chest,12,9,9,6,'#6a4f36');ellipse(chest,12,8,8,4,'#b68a4c');rect(chest,4,11,16,8,'#a07540');rect(chest,6,5,2,15,'#d8b965');rect(chest,16,5,2,15,'#d8b965');rect(chest,4,11,16,2,'#4c4832');rect(chest,10,10,4,5,'#e1c777');dot(chest,12,12,'#6e633d');save('chest',chest,24,24)

local wayFrames={}
for f=0,7 do
  local im=image(48,64)
  ellipse(im,24,58,21,5,'#526e5b');ellipse(im,24,56,19,5,'#90a388')
  poly(im,{{8,53},{8,22},{16,9},{30,6},{39,20},{40,53}},'#465e52');poly(im,{{12,52},{12,23},{19,12},{29,11},{35,22},{36,52}},'#8ca184')
  poly(im,{{19,49},{17,26},{22,19},{29,22},{31,47}},'#294f4b');line(im,23,25,23,43,'#76b5a1',2);line(im,23,28,28,32,'#bbdfbf');line(im,23,40,28,37,'#bbdfbf')
  dot(im,22,20+f*3,'#e3efc7');rect(im,10,47,7,5,P.green);rect(im,34,19,4,6,P.green);wayFrames[#wayFrames+1]=im
end
save('waystone',wayFrames,48,64,8,{{'ancient-light',1,8}})

-- Characters: 96 individually drawn frames per class / hairstyle.
-- Palette keys are deliberately shared so skin, hair and cloth recolor cleanly.
local S={skin='#e8bc94',skinLight='#f3d7b0',skinDark='#b88062',hair='#87603e',hairLight='#b08a5b',hairDark='#594431',cloth='#73916a',clothLight='#a0b181',clothDark='#4a6950'}
local function character(class,style,dir,action,f)
  local im=image(32,40)
  local side=dir==1 or dir==3
  local back=dir==2
  local step=action==1 and ({0,1,2,1,0,-1,-2,-1})[f+1] or 0
  local bob=action==1 and (f%4==1 and -1 or 0) or (f==3 or f==4) and -1 or 0
  local swing=action==2 and math.sin(f/7*math.pi) or 0
  local function R(x,y,w,h,c) rect(im,x,y+bob,w,h,c) end
  local function L(x,y,xx,yy,c,w) line(im,x,y+bob,xx,yy+bob,c,w) end
  local function E(x,y,rx,ry,c) ellipse(im,x,y+bob,rx,ry,c) end
  local function D(x,y,c) dot(im,x,y+bob,c) end
  -- Cloak, hair tails, and the ranger's quiver are behind the body.
  if class~='warrior' then
    poly(im,{{10,19+bob},{22,19+bob},{25+step/2,34},{8-step/2,34}},P.ink)
    poly(im,{{11,20+bob},{21,20+bob},{23+step/2,33},{10-step/2,33}},S.clothDark)
    L(12,23,10-step/2,32,S.cloth)
  end
  if class=='archer' then L(22,9,25,27,'#5b4735',4);L(23,9,24,23,'#ac8451',2);L(22,8,23,14,'#d0c3a0');L(25,7,25,14,'#d0c3a0');D(23,6,'#eee0b6') end
  if style==3 or style==2 then R(9,11,14,15,P.ink);R(10,11,12,14,S.hairDark) end
  -- Weight shifts are carried through legs and boots, rather than sliding.
  R(11,28+step,5,8-step,P.ink);R(18,28-step,5,8+step,P.ink)
  R(12,29+step,3,6-step,'#645443');R(19,29-step,3,6+step,'#645443')
  R(10,34+math.max(0,step),6,3,'#3b4234');R(18,34+math.max(0,-step),6,3,'#3b4234')
  L(11,34+math.max(0,step),14,34+math.max(0,step),'#998364');L(19,34+math.max(0,-step),22,34+math.max(0,-step),'#998364')
  if class=='mage' then
    poly(im,{{11,18+bob},{22,18+bob},{25,34+bob},{9,34+bob}},P.ink)
    poly(im,{{12,19+bob},{21,19+bob},{23,33+bob},{11,33+bob}},S.cloth)
    L(14,23,13,32,S.clothLight);L(20,22,22,32,S.clothDark)
    L(11,33,23,33,'#d6b977');L(17,21,17,32,'#d2b678');R(14,24,7,2,'#71593f');D(17,25,'#e2cc8e')
  else
    R(side and 12 or 10,18,side and 10 or 14,12,P.ink)
    R(side and 13 or 11,19,side and 8 or 12,10,class=='warrior' and '#8c9b90' or S.cloth)
    R(12,20,3,7,class=='warrior' and '#c3c9ad' or S.clothLight)
    R(20,20,2,8,class=='warrior' and '#586e65' or S.clothDark)
    R(10,28,14,3,'#624a34');R(15,28,4,3,'#cbae6a');D(16,29,'#5d5940')
    if class=='warrior' then R(8,18,7,5,P.ink);R(9,18,5,3,'#c4cbb2');R(20,18,6,5,P.ink);R(21,18,4,3,'#9bab9b');L(16,20,19,20,'#e0d9b6');R(16,22,3,4,S.cloth) end
    if class=='archer' then L(11,18,22,27,'#68513a',2);L(11,18,22,27,'#b39665');R(9,18,5,4,S.clothDark);R(20,18,5,4,S.clothDark) end
  end
  -- Arms and small readable hands.
  local handY=24-math.floor(swing*4)
  R(side and 13 or 7,21,4,8,P.ink);R(side and 14 or 8,22,2,5,class=='warrior' and '#b3baa1' or S.cloth)
  R(side and 14 or 8,27,3,3,S.skin);D(side and 14 or 8,29,S.skinDark)
  R(23,20,4,handY-17,P.ink);R(24,21,2,handY-18,class=='warrior' and '#a7b39e' or S.cloth)
  R(24,handY,3,3,S.skin);D(24,handY,S.skinLight)
  -- Neck, face, and consistent soft one-pixel contours.
  R(14,15,6,5,P.ink);R(15,16,4,4,S.skinDark)
  E(16,11,8,8,P.ink);R(10,7,13,9,S.skin);R(12,15,9,3,S.skinDark)
  R(11,8,10,7,S.skin);R(11,8,4,4,S.skinLight)
  if side then R(21,10,3,4,S.skin);D(23,12,S.skinLight);D(19,11,P.ink);D(19,10,'#f1e4c6');D(21,15,S.skinDark)
  elseif not back then D(12,11,P.ink);D(19,11,P.ink);D(12,10,'#f1e4c6');D(19,10,'#f1e4c6');L(15,15,17,15,S.skinDark) end
  -- Four authored hairstyles, each with a distinct silhouette.
  if back then
    E(16,10,7,7,S.hairDark);E(15,8,7,5,S.hair);L(11,6,17,4,S.hairLight,2)
    if style==3 then R(10,11,12,11,S.hair);L(11,12,11,21,S.hairLight);L(18,12,20,21,S.hairDark) end
  else
    E(16,6,8,4,P.ink);E(16,6,7,3,S.hair)
    R(9,6,3,7,S.hairDark);R(21,6,3,7,S.hairDark)
    if style==0 then
      poly(im,{{8,7+bob},{10,3+bob},{14,4+bob},{17,1+bob},{19,3+bob},{23,4+bob},{23,8+bob},{17,7+bob},{13,10+bob},{13,7+bob}},S.hair)
      L(12,4,17,3,S.hairLight);L(14,6,19,4,S.hairLight);R(21,7,2,5,S.hair)
    elseif style==1 then
      R(10,4,12,4,S.hair);L(12,4,18,4,S.hairLight);R(9,8,2,3,S.hairDark);R(22,8,1,3,S.hairDark)
    elseif style==2 then
      L(11,4,18,3,S.hairLight,2);L(9,7,14,6,S.hair);R(21,7,3,13,S.hair)
      for y=10,23,3 do R(22+(y%2),y,3,3,S.hairDark);D(22+(y%2),y,S.hairLight) end
      R(23,22,3,2,'#d3bb7c')
    else
      R(9,7,3,15,S.hair);R(21,7,3,15,S.hair);L(9,6,14,4,S.hairLight);L(10,10,10,20,S.hairLight);R(22,14,2,9,S.hairDark);L(16,4,21,8,S.hair)
    end
  end
  if class=='mage' then L(11,8,21,8,'#c6b27b');D(16,8,'#b6d5c5');D(16,7,'#f2e3b4') end
  if class=='warrior' and not back then R(10,17,3,2,'#9aa99a');R(21,17,3,2,'#73897b') end
  -- Equipment is painted into each pose; attack arcs are separate effect sprites.
  if class=='warrior' then
    local tx,ty=27-math.floor(swing*4),12+math.floor(swing*12)
    L(26,handY+5,tx,ty,P.ink,3);L(27,handY+2,tx+1,ty,'#bdcec0',2);L(27,handY+1,tx+1,ty,'#eef0d3');L(23,handY+2,29,handY+2,'#d5b675');L(26,handY+3,26,handY+7,'#8e653f')
    poly(im,{{4,23+bob},{11,21+bob},{14,24+bob},{13,31+bob},{9,35+bob},{4,31+bob}},P.ink)
    poly(im,{{5,24+bob},{10,23+bob},{12,25+bob},{11,30+bob},{9,33+bob},{6,30+bob}},'#81938a')
    L(8,24,8,31,'#c3c9a9');R(6,26,5,2,S.cloth);D(9,27,'#dfca8a')
  elseif class=='archer' then
    local x=27-math.floor(swing*2)
    poly(im,{{x-1,14+bob},{x+3,18+bob},{x+4,25+bob},{x+2,31+bob},{x-1,34+bob},{x+1,27+bob},{x+1,21+bob}},'#c7a36b')
    L(x-1,15,x-1,33,'#ded6b2');L(x-2,25,x+3,25,'#69513a');D(x+2,18,'#f0d697')
    if action==2 then L(21,24,31,24,'#d7bc80');D(31,24,'#e7e8c9') end
  else
    L(27,9,25,36,P.ink,3);L(28,11,26,35,'#b59666');L(27,21,26,34,'#785a41')
    poly(im,{{25,8+bob},{28,4+bob},{31,8+bob},{29,13+bob},{26,12+bob}},'#4f897e')
    poly(im,{{27,7+bob},{28,5+bob},{30,8+bob},{28,11+bob},{26,10+bob}},'#b0d8bd');D(28,6,'#e9f0cf');L(25,12,30,12,'#d6b876')
  end
  if dir==3 then local flipped=image(32,40);stamp(flipped,im,0,0,1,true);im=flipped end
  return im
end
for _,class in ipairs({'warrior','archer','mage'}) do
  for style=0,3 do
    local frames,tags={},{}
    for action=0,2 do for dir=0,3 do
      local first=#frames+1
      for f=0,7 do frames[#frames+1]=character(class,style,dir,action,f) end
      tags[#tags+1]={( {'idle','walk','attack'})[action+1]..'-'..({'south','east','north','west'})[dir+1],first,#frames}
    end end
    save(class..'-'..style,frames,32,40,8,tags)
  end
end

for _,kind in ipairs({'slime','mushroom','wolf','guardian'}) do
  local w,h=32,40
  if kind=='slime' then h=32 elseif kind=='wolf' then w=40 elseif kind=='guardian' then w=64;h=80 end
  local frames={}
  for f=0,7 do
    local im=image(w,h)
    local wave=math.sin(f*math.pi/4)
    if kind=='slime' then
      local ry=8+wave*1.5
      ellipse(im,16,28,12,2,C(P.ink,70));ellipse(im,16,25-ry/2,12-wave,ry,P.ink)
      ellipse(im,16,23-ry/2,11-wave,ry-1,'#63976c');ellipse(im,14,20-ry/2,8-wave,ry-3,'#93b780')
      ellipse(im,12,16-wave,3,1,'#ccdab0');line(im,7,23,10,25,'#9dc38a');line(im,21,25,24,22,'#7bad79')
      rect(im,11,21-wave,2,3,'#2e493e');rect(im,20,21-wave,2,3,'#2e493e');dot(im,12,21-wave,'#f2efd0');dot(im,21,21-wave,'#f2efd0');line(im,15,25-wave,17,25-wave,'#487454')
      poly(im,{{15,12-wave},{13,7-wave},{16,8-wave},{18,5-wave},{19,9-wave},{17,13-wave}},'#bed094');dot(im,17,8-wave,'#e5e8b6')
    elseif kind=='mushroom' then
      local bob=math.floor(wave)
      ellipse(im,16,36,11,2,C(P.ink,65));rect(im,9,30+math.max(0,bob),5,5,P.ink);rect(im,19,30+math.max(0,-bob),5,5,P.ink)
      ellipse(im,16,25+bob,9,10,P.ink);ellipse(im,16,24+bob,7,8,'#d1bf90');rect(im,12,23+bob,2,3,'#3c4b37');rect(im,19,23+bob,2,3,'#3c4b37');rect(im,15,29+bob,3,1,'#9e825d')
      ellipse(im,16,17+bob,15,9,P.ink);ellipse(im,16,15+bob,14,8,'#925943');ellipse(im,15,13+bob,12,6,'#c37b53');ellipse(im,12,11+bob,7,3,'#d69461')
      for _,p in ipairs({{8,13,3,2},{18,9,3,2},{23,15,3,2},{13,17,2,1}}) do ellipse(im,p[1],p[2]+bob,p[3],p[4],'#ead6a4') end
      line(im,5,19+bob,13,22+bob,'#ba9b71');line(im,19,22+bob,27,19+bob,'#ba9b71');rect(im,7,27+bob,3,3,'#a89970');rect(im,23,27+bob,3,3,'#a89970')
    elseif kind=='wolf' then
      local bob=math.floor(wave)
      ellipse(im,21,35,16,2,C(P.ink,65))
      for _,p in ipairs({{10,wave*2},{17,-wave*2},{27,-wave*2},{31,wave*2}}) do line(im,p[1],25,p[1]+p[2],34,'#384b43',4);line(im,p[1]+1,27,p[1]+p[2]+1,33,'#8b9a8c',2) end
      poly(im,{{7,24+bob},{3,20+bob},{1,14+bob},{6,17+bob},{11,18+bob},{29,18+bob},{34,24+bob},{29,30+bob},{12,29+bob}},P.ink)
      ellipse(im,21,24+bob,13,6,'#718578');ellipse(im,20,22+bob,10,4,'#9da994');line(im,12,22+bob,18,20+bob,'#b8bda5',2)
      poly(im,{{25,22+bob},{23,11+bob},{27,13+bob},{30,10+bob},{34,15+bob},{36,20+bob},{39,23+bob},{37,27+bob},{29,26+bob}},P.ink)
      poly(im,{{26,20+bob},{26,14+bob},{29,16+bob},{31,13+bob},{34,20+bob},{37,23+bob},{35,25+bob},{29,24+bob}},'#a3ad9a');rect(im,33,20+bob,2,1,'#ead08e');dot(im,34,20+bob,'#3d4637');rect(im,37,23+bob,2,2,'#344a40');line(im,28,23+bob,31,26+bob,'#c5c5a8')
    else
      local bob=math.floor(wave)
      ellipse(im,32,74,27,4,C(P.ink,75))
      for _,side in ipairs({-1,1}) do
        local x=32+side*12
        poly(im,{{x-5,53},{x+5,53},{x+side*4,68},{x+side*12,74},{x+side*3,73},{x-side*5,75},{x-side*2,68}},'#423f31')
        line(im,x,56,x+side*3,68,'#aa8751',3);line(im,x+side*3,68,x+side*8,71,'#866c45',2)
        line(im,32+side*18,34+bob,32+side*25,47+bob,'#3f4233',9);line(im,32+side*25,47+bob,32+side*24,59+bob,'#3f4233',8)
        line(im,32+side*18,34+bob,32+side*24,48+bob,'#8a7548',5);line(im,32+side*24,48+bob,32+side*23,58+bob,'#a18a53',3)
        line(im,32+side*12,22+bob,32+side*17,10+bob,'#6e6540',4);line(im,32+side*17,11+bob,32+side*23,4+bob,'#b5a16d',2);line(im,32+side*16,14+bob,32+side*13,4+bob,'#9c8a5a',2)
      end
      ellipse(im,32,42+bob,18,22,'#364737');ellipse(im,31,40+bob,15,20,'#7d7749');ellipse(im,28,36+bob,11,16,'#9a8e54')
      for _,p in ipairs({{21,28,23,49},{29,24,28,40},{41,31,37,51},{26,44,30,56}}) do line(im,p[1],p[2]+bob,p[3],p[4]+bob,'#5c5e3c',2) end
      ellipse(im,32,24+bob,13,12,'#2a4837');ellipse(im,31,22+bob,11,10,'#7d844c');line(im,22,23+bob,27,24+bob,'#c9dd96',2);line(im,36,24+bob,41,23+bob,'#c9dd96',2);line(im,28,30+bob,35,30+bob,'#3c5138',2)
      poly(im,{{29,37+bob},{34,35+bob},{38,41+bob},{33,48+bob},{28,44+bob}},'#345d47');line(im,32,38+bob,32,45+bob,'#aed098',2);line(im,29,40+bob,35,43+bob,'#d5e3aa')
      for _,p in ipairs({{17,30},{42,29},{25,14},{38,14},{16,39},{43,43}}) do ellipse(im,p[1],p[2]+bob,7,4,P.dark);ellipse(im,p[1]-1,p[2]-1+bob,6,3,P.green);line(im,p[1]-3,p[2]-2+bob,p[1],p[2]-3+bob,P.leaf,2) end
    end
    frames[#frames+1]=im
  end
  save(kind,frames,w,h,8,{{'alive',1,8}})
end

-- Shared effects: purposeful eight-frame arcs, bursts and drifting motes.
for _,kind in ipairs({'slash','fire','frost','arcane','heal','dust','leaf','spark'}) do
  local frames={}
  for f=0,7 do
    local im=image(64,64)
    local t=f/7
    local col=kind=='fire' and '#edac65' or kind=='frost' and '#aedbd0' or kind=='arcane' and '#b6b4dd' or kind=='heal' and '#bad59c' or '#e9d49a'
    if kind=='slash' then
      for a=-1.4+t*0.4,0.5+t*1.4,0.04 do local r=17+t*12;dot(im,32+math.cos(a)*r,32+math.sin(a)*r,col);dot(im,31+math.cos(a)*r,31+math.sin(a)*r,'#fff0c4');if f<5 then dot(im,29+math.cos(a)*r,30+math.sin(a)*r,C(col,120)) end end
    elseif kind=='leaf' then
      local x,y=32+math.sin(t*6)*4,23+t*10
      poly(im,{{x-3,y},{x+2,y-3},{x+4,y},{x,y+3}},'#c8b66c');dot(im,x,y,'#e1cd8d')
    elseif kind=='spark' then
      local r=2+math.sin(t*math.pi)*3
      line(im,32-r,32,32+r,32,col);line(im,32,32-r,32,32+r,col);dot(im,32,32,'#fff2c7')
    else
      for i=0,11 do
        local a,r=i*math.pi/6+t*0.7,6+t*22
        local x,y=32+math.cos(a)*r,32+math.sin(a)*r*0.65
        local size=math.max(1,math.floor((1-t)*4))
        rect(im,x,y,size,size,C(col,math.floor(255*(1-t*0.8))))
        if kind=='fire' then line(im,x,y,x-2,y-4*(1-t),'#da7050',size) end
        if kind=='frost' and f<5 then line(im,32,32,x,y,C(col,130));line(im,x,y,x-3,y+1,col) end
        if kind=='heal' then rect(im,x,y-8,1,5,col);rect(im,x-2,y-6,5,1,col) end
      end
      if kind=='arcane' and f<6 then for a=0,6.28,0.08 do dot(im,32+math.cos(a)*(10+t*20),32+math.sin(a)*(6+t*13),C(col,160)) end end
    end
    frames[#frames+1]=im
  end
  save('fx-'..kind,frames,64,64,8,{{kind,1,8}})
end

-- Small illustrated inventory / interface icons, from the same pixel palette.
local iconNames={'sword','bow','staff','cleave','shield','shatter','arrow','boot','volley','fire','frost','storm','potion','mana','armor','charm','gel','herb','mushroom','fang','gem','coin','bag','book','map','settings','sound','mute','people','compass','dice','heart','leaf','close','arrow-right','check'}
for _,kind in ipairs(iconNames) do
  local im=image(24,24)
  local cream,gold,dark='#ead7aa','#c8a66a','#536c5b'
  if kind=='sword' or kind=='cleave' then
    line(im,5,20,18,5,P.ink,4);line(im,7,18,20,3,'#a9bdb0',2);line(im,8,17,20,3,'#edf0d1');line(im,5,14,11,20,gold,2);line(im,4,21,7,18,'#a07c4e',2)
    if kind=='cleave' then for a=-1.6,0.2,0.08 do dot(im,8+math.cos(a)*13,16+math.sin(a)*13,cream) end end
  elseif kind=='bow' or kind=='arrow' or kind=='volley' then
    if kind=='bow' then poly(im,{{6,3},{15,5},{20,12},{17,18},{7,22},{13,16},{16,11},{12,6}},gold);line(im,6,3,7,22,cream);line(im,4,15,21,10,'#8b744e');poly(im,{{18,9},{23,9},{21,13}},'#cbd4bc')
    else for i=0,(kind=='volley' and 2 or 0) do local x=i*5;line(im,4+x,21,11+x,4,gold);poly(im,{{8+x,6},{13+x,1},{13+x,8}},cream);line(im,3+x,18,6+x,18,cream) end end
  elseif kind=='staff' then
    line(im,6,22,15,5,P.wood,3);line(im,7,22,16,5,gold);poly(im,{{10,5},{15,1},{20,5},{18,10},{13,10}},'#609c8e');poly(im,{{13,5},{15,2},{18,5},{16,8}},'#c4e0bb');line(im,11,10,19,10,gold)
  elseif kind=='shield' then
    poly(im,{{3,5},{12,2},{21,5},{20,15},{12,23},{4,15}},gold);poly(im,{{5,6},{12,4},{19,6},{18,14},{12,20},{6,14}},'#5e7c70');line(im,12,6,12,17,cream,2);line(im,8,10,16,10,cream,2)
  elseif kind=='shatter' then
    poly(im,{{2,18},{6,11},{10,16},{14,7},{22,18},{19,22},{5,22}},'#9f9270');line(im,13,10,10,17,cream);line(im,10,17,14,20,'#4b5a45');line(im,5,4,8,9,gold);line(im,18,2,17,7,gold);line(im,23,9,19,12,gold)
  elseif kind=='boot' then
    poly(im,{{8,3},{17,3},{16,15},{21,18},{21,21},{6,21},{5,17},{9,14}},P.wood);rect(im,9,4,7,4,gold);line(im,6,20,21,20,cream);line(im,11,10,15,10,'#b69560');line(im,2,8,6,8,'#a9bc95');line(im,1,12,5,12,'#a9bc95')
  elseif kind=='fire' then
    poly(im,{{12,1},{15,8},{18,5},{22,14},{20,20},{13,23},{5,20},{2,13},{7,15},{8,7}},'#bd6948');poly(im,{{12,6},{14,12},{18,11},{18,19},{12,21},{7,18},{9,13}},'#e4a355');poly(im,{{12,13},{15,19},{11,20},{9,17}},'#ffdf8c')
  elseif kind=='frost' then
    for a=0,5 do local angle=a*math.pi/3;local x,y=12+math.cos(angle)*10,12+math.sin(angle)*10;line(im,12,12,x,y,'#a8d4c6');line(im,x,y,12+math.cos(angle+0.4)*6,12+math.sin(angle+0.4)*6,'#e1edcd') end
    ellipse(im,12,12,2,2,'#eef0d4')
  elseif kind=='storm' then
    poly(im,{{14,1},{5,13},{11,13},{8,23},{21,9},{14,9}},'#ada8cf');poly(im,{{14,4},{9,11},{14,11},{11,18},{18,10},{13,10}},'#e8dcf0');dot(im,3,7,cream);dot(im,21,18,cream)
  elseif kind=='potion' or kind=='mana' then
    rect(im,9,2,6,5,'#9b7a50');rect(im,8,6,8,4,'#a6b2a0');ellipse(im,12,16,8,7,'#3f5a52');ellipse(im,12,15,7,6,kind=='potion' and '#b56762' or '#7299b4');ellipse(im,11,15,5,4,kind=='potion' and '#d48f7b' or '#98bfc5');line(im,8,12,8,16,'#f1dfb8',2);rect(im,9,3,6,2,'#c6a575');dot(im,14,19,'#dfc5a3')
  elseif kind=='armor' then
    poly(im,{{4,5},{9,3},{10,6},{14,6},{15,3},{21,6},{22,12},{18,13},{18,22},{6,22},{6,13},{2,12}},'#516e59');poly(im,{{5,6},{8,5},{10,8},{14,8},{16,5},{19,7},{20,10},{16,11},{16,20},{8,20},{8,11},{4,10}},'#97ab82');rect(im,8,15,9,2,'#826845');rect(im,11,14,3,3,gold)
  elseif kind=='charm' then
    for a=0,6.28,0.1 do dot(im,12+math.cos(a)*7,9+math.sin(a)*7,gold) end
    poly(im,{{7,15},{12,11},{17,15},{14,22},{10,22}},'#bdad6e');poly(im,{{10,16},{12,14},{14,16},{12,20}},'#8fbe9a');dot(im,12,15,cream)
  elseif kind=='gel' then ellipse(im,12,15,9,6,'#629874');ellipse(im,11,13,7,4,'#b0c998');line(im,8,11,11,10,'#e1e7bc',2)
  elseif kind=='herb' or kind=='leaf' then stamp(im,assets.herb[1],4,4)
  elseif kind=='mushroom' then stamp(im,assets.toadstool[1],4,4)
  elseif kind=='fang' then poly(im,{{5,3},{13,4},{18,11},{16,19},{9,23},{12,14},{8,10}},'#aeb9a2');poly(im,{{7,4},{12,6},{15,12},{14,18},{11,20},{13,12}},cream)
  elseif kind=='gem' then poly(im,{{7,2},{17,2},{22,10},{12,23},{2,10}},'#688e88');poly(im,{{8,4},{15,4},{19,10},{12,20},{5,10}},'#b2d0b0');line(im,8,4,12,20,'#e2e5ba');line(im,5,10,19,10,'#e2e5ba')
  elseif kind=='coin' then ellipse(im,12,13,8,9,'#8d743e');ellipse(im,11,11,8,9,'#c9a45c');ellipse(im,11,11,6,7,'#e1c27a');line(im,11,6,11,16,'#a17f44',2);line(im,8,9,14,9,'#a17f44');line(im,8,13,14,13,'#a17f44');dot(im,6,7,'#f4dda2')
  elseif kind=='bag' then
    rect(im,8,3,9,4,'#887348');rect(im,9,2,7,3,gold);poly(im,{{6,7},{18,7},{21,20},{18,23},{5,23},{3,19}},'#9a7b4c');rect(im,5,8,14,7,'#c3a06a');rect(im,7,16,10,5,'#b58e56');rect(im,10,12,4,5,'#efd69a');line(im,6,22,18,22,'#664f35')
  elseif kind=='book' then
    rect(im,4,3,16,19,'#5a6952');rect(im,6,2,15,18,'#b09a6c');rect(im,7,3,12,14,'#d2bd8c');line(im,8,6,17,6,'#867d56');line(im,8,9,17,9,'#867d56');line(im,8,12,14,12,'#867d56');rect(im,4,2,3,18,'#6f805d');line(im,6,20,19,20,'#e8dcb0')
  elseif kind=='map' then
    poly(im,{{2,5},{8,2},{16,5},{22,2},{21,20},{15,23},{8,20},{1,22}},'#d1be8d');line(im,8,4,8,19,'#a69368');line(im,15,6,15,21,'#a69368');line(im,4,15,12,9,'#8c9c6d',2);line(im,12,9,18,13,'#8c9c6d',2);rect(im,16,8,3,3,'#aa6c4d')
  elseif kind=='heart' then poly(im,{{2,5},{6,2},{11,5},{16,2},{22,5},{22,11},{12,22},{2,11}},'#a65d54');poly(im,{{4,6},{7,4},{12,8},{16,4},{20,6},{19,11},{12,18},{5,11}},'#d18b75');line(im,5,6,8,6,'#edb899')
  elseif kind=='people' then ellipse(im,8,7,4,4,gold);ellipse(im,18,8,3,3,'#a4b492');ellipse(im,8,19,6,7,gold);ellipse(im,18,19,4,6,'#a4b492')
  elseif kind=='dice' then
    rect(im,4,4,16,16,gold);rect(im,5,5,14,14,cream);for _,p in ipairs({{7,7},{15,7},{11,11},{7,15},{15,15}}) do rect(im,p[1],p[2],2,2,dark) end
  elseif kind=='close' then line(im,6,6,18,18,gold,2);line(im,6,18,18,6,gold,2)
  elseif kind=='check' then line(im,4,12,10,18,'#bdd1a1',2);line(im,10,18,21,5,'#bdd1a1',2)
  elseif kind=='arrow-right' then line(im,3,12,20,12,gold);line(im,14,6,20,12,gold);line(im,14,18,20,12,gold)
  elseif kind=='sound' or kind=='mute' then
    rect(im,3,9,5,7,gold);poly(im,{{7,9},{13,4},{13,20},{7,16}},gold)
    if kind=='sound' then line(im,17,7,20,10,gold);line(im,20,10,20,15,gold);line(im,20,15,17,18,gold) else line(im,16,9,22,15,gold);line(im,16,15,22,9,gold) end
  else
    for a=0,6.28,0.1 do dot(im,12+math.cos(a)*8,12+math.sin(a)*8,gold) end
    if kind=='compass' then poly(im,{{12,3},{16,15},{12,13},{8,17}},cream);dot(im,12,12,dark)
    else for i=0,7 do local a=i*math.pi/4;rect(im,11+math.cos(a)*10,11+math.sin(a)*10,3,3,gold) end;ellipse(im,12,12,3,3,gold) end
  end
  save('icon-'..kind,im,24,24)
end

-- Character selection diorama: a secluded clearing beneath the elder trees.
local scene=image(320,360)
rect(scene,0,0,320,360,'#324e3d')
for y=0,155 do
  local bands={'#526951','#617b5a','#789066','#8b9b6c','#a3aa77','#b1b583'}
  rect(scene,0,y,320,1,bands[math.min(6,math.floor(y/28)+1)])
end
poly(scene,{{0,87},{28,69},{68,76},{107,52},{152,75},{184,55},{220,74},{265,57},{320,82},{320,160},{0,160}},'#678263')
poly(scene,{{0,120},{45,90},{86,109},{136,81},{167,98},{208,83},{260,110},{320,97},{320,180},{0,180}},'#466f52')
for i=0,9 do stamp(scene,assets.pine[1],i*37-22,70+(i%3)*7) end
poly(scene,{{0,175},{94,160},{149,176},{239,157},{320,169},{320,360},{0,360}},'#527147')
poly(scene,{{143,163},{178,163},{190,211},{231,260},{256,360},{84,360},{112,264},{138,213}},'#8c8960')
local sr=rng(3456)
for i=0,650 do local x,y=sr(320),165+sr(195);if scene:getPixel(x,y)==C('#527147') then rect(scene,x,y,2+sr(4),1, i%3==0 and '#63804b' or '#486943') end end
stamp(scene,assets.ruin[1],85,190);stamp(scene,assets.column[1],86,150);stamp(scene,assets.column[1],210,153)
ellipse(scene,160,302,70,21,'#304d3c');ellipse(scene,160,296,68,20,'#72816a');ellipse(scene,160,291,66,20,'#a6ac86');ellipse(scene,160,290,59,16,'#8f9d79')
for a=0,6.28,0.12 do dot(scene,160+math.cos(a)*49,290+math.sin(a)*12,'#bdc098') end
for i=0,11 do local a=i*math.pi/6;line(scene,160+math.cos(a)*61,291+math.sin(a)*18,160+math.cos(a)*65,291+math.sin(a)*19,'#647b60') end
stamp(scene,assets.oak[1],-57,-6,2);stamp(scene,assets.oak[1],250,25,2);stamp(scene,assets['oak-gold'][1],-46,112,2)
stamp(scene,assets.bush[1],-4,316,2);stamp(scene,assets.bush[1],250,312,2);stamp(scene,assets.rock[1],20,294)
for _,p in ipairs({{58,285},{238,293},{87,328},{233,339},{39,271},{265,285}}) do stamp(scene,assets.flowers[1],p[1],p[2]);end
save('creation-scene',scene,320,360)

local backdrop=image(640,360)
rect(backdrop,0,0,640,360,'#718570')
rect(backdrop,0,50,640,65,'#a4aa83');rect(backdrop,0,115,640,245,'#6f8a59')
poly(backdrop,{{0,115},{77,57},{141,97},{226,48},{297,87},{367,52},{453,100},{553,57},{640,83},{640,160},{0,160}},'#587b67')
poly(backdrop,{{0,138},{107,96},{158,123},{247,97},{314,121},{411,93},{483,133},{585,105},{640,134},{640,200},{0,200}},'#456b52')
for i=0,19 do stamp(backdrop,assets.pine[1],i*35-10,89+(i%4)*7) end
poly(backdrop,{{365,157},{412,157},{431,191},{400,235},{460,280},{500,360},{332,360},{352,285},{332,238},{381,188}},'#468186')
for y=172,354,9 do local x=385+math.sin(y*.05)*22;line(backdrop,x,y,x+17,y,'#83ada0');line(backdrop,x+29,y+4,x+36,y+4,'#62988e') end
poly(backdrop,{{229,167},{242,168},{271,245},{334,360},{164,360},{206,270}},'#b39b6e')
stamp(backdrop,assets.cottage[1],117,154);stamp(backdrop,assets.inn[1],224,130)
for i=0,8 do stamp(backdrop,assets.oak[1],i*79-39,233+(i%2)*30) end
stamp(backdrop,assets['oak-gold'][1],-41,87,2);stamp(backdrop,assets.oak[1],535,99,2)
save('backdrop',backdrop,640,360)
local emblem=image(32,32)
poly(emblem,{{15,2},{20,10},{18,14},{24,20},{18,20},{18,27},{14,30},{13,20},{6,21},{12,14},{10,11}},'#c6ac72')
poly(emblem,{{15,5},{17,12},{14,16},{14,25},{16,26},{16,16},{20,18},{15,11}},'#f0dfac')
save('emblem',emblem,32,32)

-- The field map is also painted in Aseprite, using the exact shared world layout.
-- Downsample with nearest-neighbor pixel selection, preserving the original ink.
local mapFile=io.open(root..'/art/world-layout.json','r')
local layout=json.decode(mapFile:read('*a'))
mapFile:close()
local fieldMap=image(640,512)
for _,tile in ipairs(layout.tiles) do
  local v=(tile.x*71+tile.y*37+tile.x*tile.y*3)%16
  for yy=0,7 do for xx=0,7 do
    local color=terrain:getPixel(v*16+xx*2,(tile.kind==2 and 32 or 0)+yy*2)
    if tile.kind==1 then
      local pathColor=pathEdges:getPixel(tile.mask*16+xx*2,yy*2)
      if pc.rgbaA(pathColor)>0 then color=pathColor end
    elseif tile.kind==3 then color=bridge:getPixel(xx*2,yy*2) end
    dot(fieldMap,tile.x*8+xx,tile.y*8+yy,color)
  end end
end
for _,prop in ipairs(layout.props) do
  local sprite=assets[prop.sprite][1]
  local x,y=(prop.x-prop.w/2)/2,(prop.y-prop.h)/2
  for yy=0,math.floor(sprite.height/2)-1 do for xx=0,math.floor(sprite.width/2)-1 do
    local color=sprite:getPixel(xx*2,yy*2)
    if pc.rgbaA(color)>0 then dot(fieldMap,x+xx,y+yy,color) end
  end end
end
save('world-map',fieldMap,640,512)

local file=io.open(out..'manifest.json','w')
file:write('{"version":1,"aseprite":"'..tostring(app.version)..'","assets":{'..table.concat(manifest,',')..'}}')
file:close()
print('Eldervale art export complete. All source sprites saved to art/source/.')
