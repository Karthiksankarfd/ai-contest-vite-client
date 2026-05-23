import { useState } from "react";
import { createContext } from "react";

export const ContestListContext = createContext();

const ContestListProvider = ({children}) => {
  const [contestList, setContestList] = useState([])
  return (
    <ContestListContext.Provider value={{ contestList, setContestList }}>    
       {children}
    </ContestListContext.Provider>   
  )
}

export default ContestListProvider
