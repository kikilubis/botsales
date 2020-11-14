const { Telegraf } = require('telegraf');
const Markup = require('telegraf/markup');
const Wizard = require('telegraf/scenes/wizard');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const credentials = require('./GAuth/Secret/credentials.json');
const GAuth = require('./GAuth/Authenticator');
const { google } = require('googleapis');
const fetch = require('node-fetch');
var cloudinary = require('cloudinary').v2;

//telegrambot
cloudinary.config({
  cloud_name: 'do0yfzmul',
  api_key: '654566752673543',
  api_secret: '0lll8ecV5EN8rKO8CrnDtSsbpkI',
});

require('dotenv/config');
require('console-stamp')(console);

const bot = new Telegraf(process.env.TOKEN);
const googleAuth = new GAuth(
  credentials,
  './src/GAuth/Secret/token.json',
  ['https://www.googleapis.com/auth/spreadsheets'],
);

const helpMessage = `
Untuk Menggunakan Bot Ini Ada Beberapa Layanan/Perintah:
/help - Melihat Perintah
/ReplyID - Untuk Melihat Telegram ID Kita
/LihatDataSales - Untuk Melihat Data Order Sales
/LihatDataSales (ID) - Untuk Melihat Data Sales ID tertentu
/TambahOrder - Untuk Menginput Data Order Sales
/UbahOrder (ID) - Untuk Mengedit Data Order Sales ID tertentu
  `;

bot.help((ctx) => {
  ctx.reply(helpMessage);
});

const checkToken = new Wizard('CHECK_TOKEN', async (ctx) => {
  const result = await googleAuth.checkTokenAvailable();
  result
    ? ctx.reply('Token sudah ada!')
    : ctx.reply('Token belum ada!');
  return ctx.scene.leave();
});
const generateToken = new Wizard(
  'GENERATE_TOKEN',
  async (ctx) => {
    ctx.wizard.state.code = '';
    await ctx.reply(
      'Silahkan login terlebih dahulu lewat tautan di bawah ini dan kirimkan kode yang diberikan di sini.',
    );
    await ctx.reply(
      googleAuth.generateUrlOAuth(),
      Markup.keyboard(['Batal']).oneTime().resize().extra(),
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.code = ctx.message.text;
    if (ctx.wizard.state.code === 'Batal') {
      await ctx.reply(
        'Perintah berhasil dibatalkan',
        Markup.removeKeyboard().extra(),
      );
    } else {
      googleAuth
        .generateToken(ctx.wizard.state.code)
        .then(() => {
          ctx.reply(
            'Token berhasil dimasukkan!',
            Markup.removeKeyboard().extra(),
          );
        })
        .catch((err) => {
          console.log(err);
          ctx.reply(err.message, Markup.removeKeyboard().extra());
        });
    }
    return ctx.scene.leave();
  },
);
const lihatAnggota = new Wizard('LIHAT_DATA_SALES', async (ctx) => {
  const id = ctx.message.text.split(' ').slice(1)[0];
  googleAuth.execute(async (err, auth) => {
    if (err) await ctx.reply('Token tidak ditemukan.');
    else {
      const sheets = google.sheets({ version: 'v4', auth: auth });
      sheets.spreadsheets.values.get(
        {
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Data!A2:L',
        },
        async (err, res) => {
          if (err) {
            await ctx.reply(
              'Sepertinya ada kesalahan dengan server.\n' +
                err.message,
            );
            console.error(err.message);
          } else {
            const data = res.data.values;
            if (!id) {
              if (!data) {
                await ctx.reply('Data masih kosong.');
              } else {
                const cetak = data.map(
                  (anggota) => `[${anggota[0]}] ${anggota[1]}`,
                );
                await ctx.reply(
                  `Daftar Sales:\n\n[ID] Nama\n${cetak.join('\n')}`,
                );
              }
            } else {
              if (!data) {
                await ctx.reply('Data masih kosong');
              } else {
                const cetak = data.filter(
                  (idadmin) => idadmin[0] === id,
                )[0];
                if (!cetak) {
                  await await ctx.reply('ID tidak ditemukan.');
                } else if (cetak.length === 0) {
                  await ctx.reply('ID tidak ditemukan.');
                } else {
                  const titik = cetak[10].split(',');
                  await ctx.reply(
                    `Daftar sales:\n\nID: ${cetak[0]}\nNama: ${cetak[1]}\nPaket: ${cetak[2]}\nUnit: ${cetak[3]}\nNama Agent: ${cetak[4]}\nAlamat: ${cetak[5]}\nKontak PLGN: ${cetak[6]}\nSTO: ${cetak[7]}\nJenis Order: ${cetak[8]}\nEmail: ${cetak[9]}`,
                  );
                  await ctx.replyWithLocation(titik[0], titik[1]);
                  if (cetak[11]) {
                    await ctx.replyWithPhoto({ url: cetak[11] });
                  } else {
                    await ctx.reply('Photo tidak ada');
                  }
                }
              }
            }
          }
        },
      );
    }
  });
  return ctx.scene.leave();
});

const tambahAnggota = new Wizard(
  'TAMBAH_ORDER',
  async (ctx) => {
    ctx.wizard.state.data = [];
    // Ambil panjang terakhir
    googleAuth.execute(async (err, auth) => {
      if (err) await ctx.reply('Token tidak ditemukan.');
      else {
        const sheets = google.sheets({ version: 'v4', auth: auth });
        sheets.spreadsheets.values.get(
          {
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:J',
          },
          async (err, res) => {
            if (err) {
              await ctx.reply(
                'Sepertinya ada kesalahan dengan server.\n' +
                  err.message,
              );
              console.error(err.message);
              return ctx.scene.leave();
            } else {
              ctx.wizard.state.dataTerakhir = res.data.values;
              //console.log(res.data.values);
            }
          },
        );
      }
    });
    await ctx.reply(
      `Silahkan masukkan data dengan format ini:\n\n[Nama]\n[Paket]\n[Unit]\n[Nama Agent]\n[Alamat]\n[Kontak PLGN]\n[STO]\n[Jenis Order]\n[Email]`,
    );
    await ctx.reply(
      `Kiki\nNETIZEN (INET-TV) 10 MBPS\nDBS WITEL\nKiki\nCot Girek\n+6285211421369\nLTM\nPSB\nriski.nadya.lubis.031099@gmail.com`,
    );
    await ctx.reply('Klik /batal untuk membatalkan proses');
    return ctx.wizard.next();
  },
  async (ctx) => {
    // validation

    if (!ctx.message.text) {
      await ctx.reply('Data yang diterima harus berupa text');
      return;
    }
    if (ctx.message.text === '/batal') {
      await ctx.reply('Perintah tambah order telah dibatalkan!');
      return ctx.scene.leave();
    }
    const newData = ctx.message.text.split('\n');
    if (newData.length != 9) {
      await ctx.reply(
        'Data yang diisi belum lengkap, silahkan ulangi sesuai contoh',
      );
      await ctx.reply(
        `Silahkan masukkan data dengan format ini:\n\n[Nama]\n[Paket]\n[Unit]\n[Nama Agent]\n[Alamat]\n[Kontak PLGN]\n[STO]\n[Jenis Order]\n[Email]`,
      );
      await ctx.reply(
        `Kiki\nNETIZEN (INET-TV) 10 MBPS\nDBS WITEL\nKiki\nCot Girek\n+6285211421369\nLTM\nPSB\nriski.nadya.lubis.031099@gmail.com`,
      );
      return;
    }
    await ctx.reply('Kirim location untuk ditambahkan!');
    await ctx.reply('Klik /batal untuk membatalkan proses');
    ctx.wizard.state.data = newData;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // validation
    if (ctx.message.text === '/batal') {
      await ctx.reply('Perintah tambah order telah dibatalkan!');
      return ctx.scene.leave();
    }
    if (!ctx.message.location) {
      ctx.reply(
        'Data yang dikirim bukan lokasi, silahkan mengirim lokasi',
      );
      return;
    }
    const tikor =
      ctx.message.location.latitude +
      ',' +
      ctx.message.location.longitude;
    await ctx.reply('Kirim foto KTP untuk ditambahkan!');
    await ctx.reply('Klik /batal untuk membatalkan proses');
    ctx.wizard.state.lokasi = tikor;
    return ctx.wizard.next();
  },

  async (ctx) => {
    // validation
    if (ctx.message.text === '/batal') {
      await ctx.reply('Perintah tambah order telah dibatalkan!');
      return ctx.scene.leave();
    }
    if (!ctx.message.photo) {
      ctx.reply(
        'Data yang dikirim bukan berupa photo, silahkan mengirim photo',
      );
      return;
    } else {
      const a = await fetch(
        'https://api.telegram.org/bot' +
          process.env.TOKEN +
          '/getFile?file_id=' +
          ctx.message.photo[ctx.message.photo.length - 1].file_id,
      );
      const x = await a.json();

      var hasil =
        'https://api.telegram.org/file/bot' +
        process.env.TOKEN +
        '/' +
        x.result.file_path;

      const cl = await cloudinary.uploader.upload(
        hasil,
        { tags: 'ORDER' },
        function (err, image) {
          console.log();
          if (err) {
            console.warn(err);
          }
        },
      );
      await ctx.reply('Data sudah sesuai, mencoba meng-input data');

      ctx.wizard.state.url = cl.secure_url;

      googleAuth.execute(async (err, auth) => {
        if (err) await ctx.reply('Token tidak ditemukan.');
        else {
          const panjangDataTerakhir = ctx.wizard.state.dataTerakhir
            ? ctx.wizard.state.dataTerakhir.length
            : 0;
          const rowNumber = panjangDataTerakhir + 2;
          const rangeHarapan = `Data!A${rowNumber}:L${rowNumber}`;
          const newID = ctx.wizard.state.dataTerakhir
            ? parseInt(
                ctx.wizard.state.dataTerakhir[
                  panjangDataTerakhir - 1
                ][0],
              ) + 1
            : 1;
          const newData = ctx.wizard.state.data;
          const tikor = ctx.wizard.state.lokasi;
          const urlnya = ctx.wizard.state.url;
          const sheets = google.sheets({ version: 'v4', auth: auth });
          sheets.spreadsheets.values
            .update({
              range: rangeHarapan,
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values: [
                  [
                    newID,
                    newData[0],
                    newData[1],
                    newData[2],
                    newData[3],
                    newData[4],
                    newData[5],
                    newData[6],
                    newData[7],
                    newData[8],
                    tikor,
                    urlnya,
                  ],
                ],
              },
            })
            .then(async (response) => {
              if (response.status === 200) {
                await ctx.reply('Data berhasil ditambahkan!');
              }
            })
            .catch(async (err) => {
              console.log(err);
              await ctx.reply(err.message);
            });
        }
        return ctx.scene.leave();
      });
    }
  },
);

const ubahAnggota = new Wizard(
  'UBAH_ORDER',
  async (ctx) => {
    ctx.wizard.state.data = [];
    // awal 
    const id = ctx.message.text.split(' ').slice(1)[0];
    googleAuth.execute(async (err, auth) => {
      if (err) await ctx.reply('Token tidak ditemukan.');
      else {
        const sheets = google.sheets({ version: 'v4', auth: auth });
        sheets.spreadsheets.values.get(
          {
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:L',
          },
          async (err, res) => {
            if (err) {
              await ctx.reply(
                'Sepertinya ada kesalahan dengan server.\n' +
                  err.message,
              );
              console.error(err.message);
            } else {
              const data = res.data.values;
              const pesan = `ID ${id} tidak ditemukan. \nPastikan id yang akan diedit dengan perintah /LihatDataSales`;
              if (!data) {
                await ctx.reply(pesan);
                return ctx.scene.leave();
              } else {
                const cetak = data.filter(
                  (idadmin) => idadmin[0] === id,
                )[0];
                if (!cetak) {
                  await ctx.reply(pesan);
                  return ctx.scene.leave();
                } else if (cetak.length === 0) {
                  await ctx.reply(pesan);
                  return ctx.scene.leave();
                } else {
                  await ctx.reply(
                    'Apakah anda ingin mengubah data id =' + id,
                  );
                  await ctx.reply(
                    `Untuk mengedit, masukkan data dengan format ini:\n\n[Nama]\n[Paket]\n[Unit]\n[Nama Agent]\n[Alamat]\n[Kontak PLGN]\n[STO]\n[Jenis Order]\n[Email]`,
                  );
                  await ctx.reply(
                    `Kiki\nNETIZEN (INET-TV) 10 MBPS\nDBS WITEL\nKiki\nCot Girek\n+6285211421369\nLTM\nPSB\nriski.nadya.lubis.031099@gmail.com`,
                  );
                  await ctx.reply(
                    'Klik /batal untuk membatalkan proses',
                  );
                  ctx.wizard.state.editid = id;
                }
              }
            }
          },
        );
      }
    });
    //batas
    return ctx.wizard.next();
  },
  async (ctx) => {
    // validation

    if (!ctx.message.text) {
      await ctx.reply('Data yang diterima harus berupa text');
      return;
    }
    if (ctx.message.text === '/batal') {
      await ctx.reply('Perintah tambah order telah dibatalkan!');
      return ctx.scene.leave();
    }
    const newData = ctx.message.text.split('\n');
    if (newData.length != 9) {
      await ctx.reply(
        'Data yang diisi belum lengkap, silahkan ulangi sesuai contoh',
      );
      await ctx.reply(
        `Silahkan masukkan data dengan format ini:\n\n[Nama]\n[Paket]\n[Unit]\n[Nama Agent]\n[Alamat]\n[Kontak PLGN]\n[STO]\n[Jenis Order]\n[Email]`,
      );
      await ctx.reply(
        `Kiki\nNETIZEN (INET-TV) 10 MBPS\nDBS WITEL\nKiki\nCot Girek\n+6285211421369\nLTM\nPSB\nriski.nadya.lubis.031099@gmail.com`,
      );
      return;
    }
    await ctx.reply('Kirim location untuk ditambahkan!');
    await ctx.reply('Klik /batal untuk membatalkan proses');
    ctx.wizard.state.data = newData;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // validation
    if (ctx.message.text === '/batal') {
      await ctx.reply('Perintah tambah order telah dibatalkan!');
      return ctx.scene.leave();
    }
    if (!ctx.message.location) {
      ctx.reply(
        'Data yang dikirim bukan lokasi, silahkan mengirim lokasi',
      );
      return;
    }
    const tikor =
      ctx.message.location.latitude +
      ',' +
      ctx.message.location.longitude;
    await ctx.reply('Kirim foto KTP untuk ditambahkan!');
    await ctx.reply('Klik /batal untuk membatalkan proses');
    ctx.wizard.state.lokasi = tikor;
    return ctx.wizard.next();
  },

  async (ctx) => {
    // validation
    if (ctx.message.text === '/batal') {
      await ctx.reply('Perintah tambah order telah dibatalkan!');
      return ctx.scene.leave();
    }
    if (!ctx.message.photo) {
      ctx.reply(
        'Data yang dikirim bukan berupa photo, silahkan mengirim photo',
      );
      return;
    } else {
      const a = await fetch(
        'https://api.telegram.org/bot' +
          process.env.TOKEN +
          '/getFile?file_id=' +
          ctx.message.photo[ctx.message.photo.length - 1].file_id,
      );
      const x = await a.json();

      const hasil =
        'https://api.telegram.org/file/bot' +
        process.env.TOKEN +
        '/' +
        x.result.file_path;
      const cl = await cloudinary.uploader.upload(
        hasil,
        { tags: 'ORDER' },
        function (err, image) {
          console.log();
          if (err) {
            console.warn(err);
          }
        },
      );
      await ctx.reply(
        'Data sudah sesuai, mencoba merubah  data id =' +
          ctx.wizard.state.editid,
      );
      ctx.wizard.state.url = cl.secure_url;

      googleAuth.execute(async (err, auth) => {
        if (err) await ctx.reply('Token tidak ditemukan.');
        else {
          const rowNumber = Number(ctx.wizard.state.editid) + 1;
          const rangeHarapan = `Data!A${rowNumber}:L${rowNumber}`;
          const newID = ctx.wizard.state.editid;
          const newData = ctx.wizard.state.data;
          const tikor = ctx.wizard.state.lokasi;
          const urlnya = ctx.wizard.state.url;
          const sheets = google.sheets({ version: 'v4', auth: auth });
          sheets.spreadsheets.values
            .update({
              range: rangeHarapan,
              spreadsheetId: process.env.GOOGLE_SHEET_ID,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values: [
                  [
                    newID,
                    newData[0],
                    newData[1],
                    newData[2],
                    newData[3],
                    newData[4],
                    newData[5],
                    newData[6],
                    newData[7],
                    newData[8],
                    tikor,
                    urlnya,
                  ],
                ],
              },
            })
            .then(async (response) => {
              if (response.status === 200) {
                await ctx.reply('Data berhasil dirubah!');
              }
            })
            .catch(async (err) => {
              console.log(err);
              await ctx.reply(err.message);
            });
        }
        return ctx.scene.leave();
      });
    }
  },
);
const stage = new Stage([
  checkToken,
  generateToken,
  lihatAnggota,
  tambahAnggota,
  ubahAnggota,
]);
bot.use(session());
bot.use(stage.middleware());

bot.command('hello', (ctx) => ctx.reply('Hello world!'));
bot.command('checkToken', Stage.enter('CHECK_TOKEN'));
bot.command('generateToken', Stage.enter('GENERATE_TOKEN'));

//Fungsi Slice
bot.hears(/^\/\w+/i, async (ctx) => {
  bot.options.username = '@firebasekubot';

  if (await check(ctx)) {
    return;
  }
});

bot.launch().then(() => {
  console.log('Bot telah diaktifkan!');
});

//ini fungsi check command dan permisi
let check = async (ctx) => {
  // fungsi baru
  const id = ctx.from.id;
  const msg = ctx.message.text.toLowerCase();

  googleAuth.execute(async (err, auth) => {
    if (err) await ctx.reply('Token tidak ditemukan.');
    else {
      const sheets = google.sheets({ version: 'v4', auth: auth });
      sheets.spreadsheets.values.get(
        {
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: 'Admin!A2:B',
        },
        async (err, res) => {
          if (err) {
            return console.log(err.message);
          } else {
            const data = res.data.values;
            const admin = data.map((idadmin) => `${idadmin[0]}`);

            isadmin = false;
            admin.forEach((element) => {
              if (id === Number(element)) {
                isadmin = isadmin || true;
              }
            });

            try {
              // Perintah START
              if (msg == '/start') {
                if (isadmin) {
                  await ctx.reply(
                    'ID Anda Sudah Terdaftar\n /help - Untuk Melihat Perintah',
                  );
                  return true;
                } else
                  ctx.reply(
                    'Tidak punya hak akses\n /ReplyID - Mengetahui ID',
                  );
                return true;
              }

              // Perintah REPLY ID
              if (msg.substring(0, 8) == '/replyid') {
                {
                  await ctx.reply(ctx.from.id);
                  return true;
                }
              }

              // Perintah LIHAT DATA SALES
              if (msg.substring(0, 15) == '/lihatdatasales') {
                if (isadmin) {
                  await ctx.scene.enter('LIHAT_DATA_SALES');
                  return true;
                }
                ctx.reply('tidak punya hak akses');
                return true;
              }

              // TAMBAH ORDERAN SALES
              if (msg.substring(0, 12) == '/tambahorder') {
                if (isadmin) {
                  await ctx.scene.enter('TAMBAH_ORDER');
                  return true;
                }
                ctx.reply('tidak punya hak akses');
                return true;
              }
              // TAMBAH ORDERAN SALES
              if (msg.substring(0, 10) == '/ubahorder') {
                if (isadmin) {
                  await ctx.scene.enter('UBAH_ORDER');
                  return true;
                }
                ctx.reply('tidak punya hak akses');
                return true;
              }
              if (msg === '/help') {
                await ctx.reply(helpMessage);
              } else {
                ctx.reply('Perintah tidak dikenal');
              }
              return false;
            } catch (err) {
              console.log(err);
              return false;
            }
          }
        },
      );
    }
  });
};
