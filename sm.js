class SM3 {
  constructor(){
    this.fileName = ''
		this.show = false
		this.file = ''
		this.hash = '正在计算中'
		this.blocks= 0 //文件块数
		this.currentBlock =  0, //当前计算块数
		this.ready = false //能否提交
		this.hashProgress = 0
		this.uploadProgress = '未上传'
		this.V = []
    this.eventList = []
  }
	//二进制数组转16进制表示的字符串
  bin2hex(bin){
    var len = bin.length;
    for (var i = 0; i < len; i++) {
      bin[i] = ("0000000" + (bin[i] >>> 0).toString(16)).slice(-8); //长度不足则补0
    }
    return bin.join('');
  }

  P0(X) {
    return X ^ ((X << 9) | (X >>> (32 - 9))) ^ ((X << 17) | (X >>> (32 - 17)));
  }

  P1(X) {
    return X ^ ((X << 15) | (X >>> (32 - 15))) ^ ((X << 23) | (X >>> (32 - 23)));
  }

  FF(X, Y, Z, j) {
    return j < 16 ? X ^ Y ^ Z : (X & Y) | (X & Z) | (Y & Z);
  }

  GG(X, Y, Z, j) {
    return j < 16 ? X ^ Y ^ Z : (X & Y) | (~X & Z);
  }

  //SM3算法主体流程
  SM3(msg, len, mLen) {
    //对最后一块进行消息填充
    if (this.currentBlock != this.blocks) {
      var n = 81920; //5*1024*1024*8/512
    } else {
      msg[mLen >> 2] |= 0x80 << (24 - mLen % 4 * 8); //数组末尾补‘1000 0000’
      var n = ((mLen + 8) >> 6) + 1; //总组数
      var wn = n * 16; //数组长度
      var i = (mLen >> 2) + 1;
      for (; i < wn; i++) {
        msg[i] = 0;
      }
      msg[wn - 1] = len * 8; //最后填上明文长度
    }

    //CF函数
    var i = 0;
    var A;
    var B;
    var C;
    var D;
    var E;
    var F;
    var G;
    var H;
    var SS1;
    var SS2;
    var TT1;
    var TT2;
    var T;
    while (i < n) {
      //消息拓展
      var W = new Array(68); 
      var W1 = new Array(64);//W'
      var j = 0;
      for (; j < 68; j++) {
        W[j] = j < 16 ? msg[i * 16 + j] | 0 : this.P1(W[j - 16] ^ W[j - 9] ^ ((W[j - 3] << 15) | (W[j - 3] >>> (32 - 15)))) ^ ((W[j - 13] << 7) | (W[j - 13] >>> (32 - 7))) ^ W[j - 6];
      }

      for (j = 0; j < 64; j++) {
        W1[j] = W[j] ^ W[j + 4];
      }

      //压缩函数
      A = this.V[0] | 0;
      B = this.V[1] | 0;
      C = this.V[2] | 0;
      D = this.V[3] | 0;
      E = this.V[4] | 0;
      F = this.V[5] | 0;
      G = this.V[6] | 0;
      H = this.V[7] | 0;

      for (j = 0; j < 64; j++) {
        T = j < 16 ? 0x79CC4519 : 0x7A879D8A;
        SS1 = ((((A << 12) | (A >>> (32 - 12))) + E + ((T << j) | (T >>> (32 - j)))) << 7) | ((((A << 12) | (A >>> (32 - 12))) + E + ((T << j) | (T >>> (32 - j)))) >>> (32 - 7));
        SS2 = SS1 ^ ((A << 12) | (A >>> (32 - 12)));
        TT1 = (this.FF(A, B, C, j) + D + SS2 + W1[j]) | 0;
        TT2 = (this.GG(E, F, G, j) + H + SS1 + W[j]) | 0;
        D = C;
        C = (B << 9) | (B >>> (32 - 9));
        B = A;
        A = TT1;
        H = G;
        G = (F << 19) | (F >>> (32 - 19));
        F = E;
        E = this.P0(TT2);
      }

      this.V[0] ^= A;
      this.V[1] ^= B;
      this.V[2] ^= C;
      this.V[3] ^= D;
      this.V[4] ^= E;
      this.V[5] ^= F;
      this.V[6] ^= G;
      this.V[7] ^= H;

      i++;
    }

    //根据是不是最后一块文件块，判断是否显示结果
    if (this.currentBlock != this.blocks) {
      return;
    } else {
      this.hash = this.bin2hex(this.V);
      return;
    }
  }

  //恢复全局变量为初始值
  reset() {
    this.V = [
      0x7380166f | 0,
      0x4914b2b9 | 0,
      0x172442d7 | 0,
      0xda8a0600 | 0,
      0xa96f30bc | 0,
      0x163138aa | 0,
      0xe38dee4d | 0,
      0xb0fb0e4e | 0,
    ]; //初始值IV
    this.blocks = 0;
    this.currentBlock = 0;
    this.hash = '正在计算中';
    this.hashProgress = 0.0;
    this.uploadProgress = '未上传';
  }

  //获取用户文件函数，并计算文件的哈希值
  genHash(file) {
    let file0 = file;
    this.file = file;
    this.fileName = this.file.name;
    //读取文件，计算哈希值
    this.reset();
    console.time('x');   //测试时间，开始计时
    var fileReader = new FileReader();
    var blobSlice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
    var blockSize = 5 * 1024 * 1024; //文件按照5MB的大小划分
    this.blocks = Math.ceil(file0.size / blockSize);
    var start = 0;
    var end = start + blockSize >= file0.size ? file0.size : (start + blockSize);
    fileReader.readAsArrayBuffer(blobSlice.call(file0, start, end));
    var self = this;
    return new Promise(resolve=>{
      fileReader.onload = function(fileStr) {
        self.currentBlock++;
        var buffer = new Uint8Array(fileStr.target.result);
  
        if (self.currentBlock < self.blocks) {
          //转成八位二进制码
          var binArray = new Array(1310720); //一个元素32bit，所以数组长度相当于字节长度除以四
          var i = 0;
          while (i < 41943040) {
            binArray[i >> 5] |= (buffer[i >> 3] & 0xFF) << (24 - i % 32);
            i += 8;
          }
  
          self.SM3(binArray, 0, 0);
          self.hashProgress = parseFloat((blockSize / file0.size * 100 + self.hashProgress).toPrecision(5));
          start = self.currentBlock * blockSize;
          end = start + blockSize >= file0.size ? file0.size : (start + blockSize);
          fileReader.readAsArrayBuffer(blobSlice.call(file0, start, end));
        } else {
          var mLen = fileStr.target.result.byteLength; //当前读取字符串长度
  
          //转成八位二进制码
          var binArray = new Array(mLen >> 2); //一个元素32bit，所以数组长度相当于字节长度除以四
          var i = 0;
          var count = mLen * 8;
          while (i < count) {
            binArray[i >> 5] |= (buffer[i >> 3] & 0xFF) << (24 - i % 32);
            i += 8;
          }
  
          self.SM3(binArray, file0.size, mLen);
          self.hashProgress = 100.00;
          self.ready = true;
          resolve(self.hash)
          self.eventList.forEach(event=>{
            event()
          })
        }
      }
    })
  }
  on(callback){
    this.eventList.push(callback)
  }
}