const express = require("express");
const router = express.Router();
const BookingRepo = require("../../repositories/Booking/BookingRepo");
const TicketRepo = require("../../repositories/Ticket/TicketRepo");
const UserRepository = require("../../repositories/User/UserRepo");
const ShowTimeRepo = require("../../repositories/ShowTime/ShowTimeRepo");
const CinemaRepo = require("../../repositories/Cinema/CinemaRepo");
const nodemailer = require('nodemailer');
require('dotenv').config();
let EMAIL;
let PASSWORD;

router.get("/choose-seat", (req, res) => {
  //To get available horizontal, verticle address

  const qFilmID = req.query.filmID;
  const showtimeID = req.query.showtimeID;

  TicketRepo.getAllSeatUnvailableInShowTime(qFilmID, showtimeID)
    .then((seatUnavailable) => {
        //console.log(seatUnavailable);
      res.render("Booking/choose-seat", { seatUnavailable});
    })
    .catch((err) => {
      console.log(err);
      res.render("error/error");
    });
});

router.get("/confirm-booking", (req, res) => {

    const totalChair = req.query.totalChair;
    const chairCodes = req.query.chairCode;
    const h_addresses = req.query.h_address;
    const v_addresses = req.query.v_address;

    let seatChoosenList = '';

    console.log(chairCodes);

    for(let index = 0; index < totalChair; ++index) {
      
      const seat = {
        // If chairCodes array have:
        //    @ only one element, that element will be a string, access it by: chairCodes.
        //    @ more than one element, it will be an element -> access it by: chairCodes[0].
        chairCode: totalChair == 1 ? chairCodes : chairCodes[index],
        horizontalAddress:  h_addresses[index],
        verticleAddress: v_addresses[index],
      }

      console.log(seat.chairCode);

      seatChoosenList += index !== totalChair - 1 ? `${seat.chairCode} - ` : `${seat.chairCode}`;
    }

    const totalMoney = totalChair * 45000;

    res.render("Booking/confirm-booking", {totalMoney, seatChoosenList});
    
});

router.post("/confirm-booking", async (req, res) => {

  //if user not login yet.
  if(!req.currentUser) {
    res.render('error/check-login');
  }

  const qShowtimeID = req.query.showtimeID;
  const totalChair = req.query.totalChair;
  const chairCodes = req.query.chairCode;
  const h_addresses = req.query.h_address;
  const v_addresses = req.query.v_address;
  const { total_money } = req.body; 

  const newBooking = {
    bookTime: new Date(),
    totalMoney: total_money,
    user_id: req.currentUser.uuid,
    showtime_id: qShowtimeID,
  };

  BookingRepo.add(newBooking)
    .then((bookingAdded) => {
      //If user have enough money

      if(req.currentUser.wallet >= total_money)      
      {
        for(let index = 0; index < totalChair; ++index) {
          const newTicket = {
            chairCode: chairCodes[index],
            horizontalAddress: h_addresses[index],
            verticleAddress: v_addresses[index],
            price: 45000,
            booking_id: bookingAdded.uuid,
          };
    
          TicketRepo.add(newTicket).then(result => {

          })
          .catch(error => console.log(error));
        }

        remainAmount = req.currentUser.wallet - total_money;
        UserRepository.updateWallet(req.currentUser.uuid, remainAmount).then(result => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL , // Real email
                pass: process.env.PASSWORD , // Real Email Password
            },
        });
        ShowTimeRepo.getCinema(newBooking.showtime_id).then((showTime) =>{
          console.log("sssssssssssssss",showTime);
            const mailOptions = {
              from: process.env.GMAIL,
              to: req.currentUser.email,
              subject: 'Verify Booking',
              html: `<h1>Booking success</h1> <h3>Cinema: ${showTime[0].displayName}  </h3> <h3>Showtime: ${showTime[0].startTime} to ${showTime[0].endTime} </h3> <h3>You seat: ${chairCodes} </h3>`,
          };
            transporter
                    .sendMail(mailOptions)
                    .then((respond) => {
                      res.redirect("/booking-history");
                    })
                    .catch((err) => res.send('Error: ' + err));
            });
        })
        .catch(error => res.render("error/error"));
      }
      else {
        res.render("error/not-enough-money")
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

module.exports = router;
