import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from "stripe";
import User from "../models/User.js"


//Place Order COD : /api/order/cod
export const placeOrderCOD = async(req, res)=>{
    try {
        const userId = req.userId;
        const {items, address} = req.body;
        // console.log("body from the placeorderCod -->",req.body)
        if(!address || items.length === 0){
            return res.json({success: false, message: "Invalid data"})
        }
        //Calculate Amount Using Items
        // let amount = await items.reduce(async(acc,item)=>{
        //     const product = await Product.findById(item.product);
        //     return (await acc) + product.offerPrice * item.quantity;
        // }, 0)

        // const orderItem = await Product.findById(items[0].product);

        // let overAllPrice = (orderItem?.offerPrice * items[0].quantity);

        // console.log("this  is the order item from the placeorder api",orderItem)

        let amount = 0;
        for (const item of items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.json({ success: false, message: "Product not found" });
            }

            amount += product.offerPrice * item.quantity;
        }
        
        // Add Tac Charges(2%)
        amount += Math.floor(amount * 0.02);
        // overAllPrice += Math.floor(overAllPrice * 0.02);
        // add the payment gatway here

        await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "COD", 
        })
        return res.json({success: true,message: "Order Placed Successfully"})
    } catch (error) {
        console.log("error from the placeordercod api controller -->,",error)
        return res.json({success: false, message: error.message});
    }   
}

//Place Order STRIPE : /api/order/stripe
export const placeOrderStripe = async(req, res)=>{
    try {
        const userId = req.userId;
        const {items, address} = req.body;
        const {origin} = req.headers;
        console.log("body from the placeorderCod -->",req.body)

        if(!address || items.length === 0){
            return res.json({success: false, message: "Invalid data"})
        }
        let amount = 0;
        let productData = [];

        //Calculate Amount Using Items

        for (const item of items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.json({ success: false, message: "Product not found" });
            }

            amount += product.offerPrice * item.quantity;

            productData.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity, 
            });
        }


        // let amount = await items.reduce(async(acc,item)=>{
        //     const product = await Product.findById(item.product);
        //     productData.push({
        //         name : product.name,
        //         price : product.offerPrice,
        //         qunatity : item.quantity,
        //     });
        //     return (await acc) + product.offerPrice * item.quantity;
        // }, 0)

        // const orderItem = await Product.findById(items[0].product);

        // let overAllPrice = (orderItem?.offerPrice * items[0].quantity);

        // console.log("this  is the order item from the placeorder api",orderItem)

        
        // Add Tac Charges(2%)
        
        // overAllPrice += Math.floor(overAllPrice * 0.02);
        amount += Math.floor(amount * 0.02);
        // add the payment gatway here

        const order = await Order.create({
            userId,
            items,
            amount,
            address,
            paymentType: "Online", 
        })

        //Stripe gateway intialize
        const stripeInstatance = new stripe(process.env.STRIPE_SECRET_KEY);

        //create line items for stripe

        const line_items = productData.map(item => ({
            price_data: {
                currency: "usd",
                product_data: { name: item.name },
                unit_amount: Math.floor(item.price * 1.02 * 100), // price + tax
            },
            quantity: item.quantity,
        }));

        //create session 
        const session = await stripeInstatance.checkout.sessions.create({
            line_items,
            mode : "payment",
            success_url: `${origin}/loader?next=my-orders`,
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId,
            }
        })

        return res.json({success: true,url: session.url })
    } catch (error) {
        console.log("error from the placeordercod api controller -->,",error)
        return res.json({success: false, message: error.message});
    }   
}

//Stripe Webhook to verify payment Actions : /stripe
export const stripeWebhooks = async(req, res)=>{
    const stripeInstatance = new stripe(process.env.STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"];
    let event ;
    try {
        event = stripeInstatance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
    //Handle the event 
    switch(event.type){
        case "payment_intent.succeeded":{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            //Getting session metadata
            const session = await stripeInstatance.checkout.sessions.list({
                payment_intent : paymentIntentId,
            });
            const {orderId, userId} = session.data[0].metadata;
            //Mark Payment as Paid
            await Order.findByIdAndUpdate(orderId,{isPaid : true})
            //Clear user cart
            await User.findByIdAndUpdate(userId, {cartItems: {}});
            break;
        
        }
        case "payment_intent.payment_failed":{
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            //Getting session metadata
            const session = await stripeInstatance.checkout.sessions.list({
                payment_intent : paymentIntentId,
            });
            const {orderId} = session.data[0].metadata;
            await Order.findByIdAndDelete(orderId);
            break;
        }
        default:
            console.error(`Unhandled event type ${event.type}`);
            break;
    }
    res.json({received: true});
}

// Get Order by User ID : /api/order/user
export const getUserOrders = async (req, res)=>{
    try {
        const userId = req.userId;
        const orders = await Order.find({
            userId,
            $or: [{paymentType: "COD"},{isPaid: true}]
        }).populate("items.product address").sort({createdAt: -1});
        res.json({success: true, orders});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}


//Get All Orders(for seller / admin) : /api/order/seller
export const getAllOrders = async (req, res)=>{
    try {
        const orders = await Order.find({          
            User, 
            $or: [{paymentType: "COD"},{isPaid: true}]
        }).populate("items.product address").sort({createdAt: -1});
        res.json({success: true, orders});

    } catch (error) {
        res.json({success: false, message: error.message});
    }
}