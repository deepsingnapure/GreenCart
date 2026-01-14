import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext(null);

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();
  const currency = import.meta.env.VITE_CURRENCY;
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [searchQuery,setSearchQuery] = useState("");
  
  //Fetch seller status
  const fetchSeller = async()=>{
    try {
      const {data} = await axios.get('/api/seller/is-auth');
      if(data.success){
        setIsSeller(true)
      }else{
        setIsSeller(false)
      }
    } catch (error) {
      setIsSeller(false);
    }
  }

  //fetch user auth status, user data and cart items
  const fetchUser = async()=>{
    try {
      const { data } = await axios.get("/api/user/is-auth");
      if(data.success){
        setUser(data.user && data.user)
        setCartItems(data.user.cartItems|| {})
      }
    } catch (error) {
      setUser(null);
      setCartItems({});
    }
  }

  //fetach all products
  const fetchProduct = async()=>{
    try {
      const {data } = await axios.get('/api/product/list')
      if(data.success){
        setProducts(data.products)
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message);
    }
  }

  const addToCart = (itemId) => {
  let cartData = structuredClone(cartItems);

  if (cartData[itemId]) {
    cartData[itemId] += 1;
  } else {
    cartData[itemId] = 1;
  }
  setCartItems(cartData);
  toast.success("Added to Cart");
};

//get cart item count

  const getCartCount =() =>{
    let totalCount = 0;
    for(const item in cartItems){
      totalCount += cartItems[item];
    }
    return totalCount;
  }

  //get cart total amount

  const getCartAmount = () => {
  let totalAmount = 0;

  for (const itemId in cartItems) {
    const itemInfo = products.find(product => product._id === itemId);
    if (itemInfo && cartItems[itemId] > 0) {
      totalAmount += itemInfo.offerPrice * cartItems[itemId];
    }
  }

  return Math.floor(totalAmount * 100) / 100;
};



  const updateCartItem = (itemId, quantity)=>{
    let cartData = structuredClone(cartItems);
    cartData[itemId] = quantity;
    setCartItems(cartData)
    toast.success("Cart Updated")
  }

  const removeFromCart = (itemId)=>{
    let cartData = structuredClone(cartItems);
    if(cartData[itemId]){
      cartData[itemId] -= 1;
      if(cartData[itemId] === 0){
        delete cartData[itemId];
      }
    }
    setCartItems(cartData);
    toast.success("Removed from Cart");
  }

  useEffect(()=>{
    fetchUser()
    fetchSeller()
    fetchProduct()
  },[])


 useEffect(()=>{
  const updateCart = async()=>{
    try {
      const {data} = await axios.post('/api/cart/update',{ cartItems });
      if(!data.success){
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  if(user){
    updateCart()
  }

}, [cartItems])



  const value = {
    user,
    setUser,
    isSeller,
    setIsSeller,
    navigate,
    showUserLogin,
    setShowUserLogin,
    products,
    currency,
    addToCart,
    updateCartItem,
    removeFromCart,
    cartItems,
    searchQuery,
    setSearchQuery,
    getCartAmount,
    getCartCount,
    axios,
    fetchProduct,
    setCartItems,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};
