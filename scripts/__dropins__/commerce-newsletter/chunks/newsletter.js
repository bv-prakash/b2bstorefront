/*! Copyright 2026 Adobe
All Rights Reserved. */
import{FetchGraphQL as r}from"@dropins/tools/fetch-graphql.js";const{setEndpoint:n,setFetchGraphQlHeader:c,removeFetchGraphQlHeader:l,setFetchGraphQlHeaders:b,fetchGraphQl:a,getConfig:h}=new r().getMethods(),o=`
  mutation subscribeEmailToNewsletter($email: String!) {
    subscribeEmailToNewsletter(email: $email) {
      status
    }
  }
`,m=async t=>{const e=await a(o,{variables:{email:t}});if(e.errors)throw new Error(e.errors[0].message);const s=e.data&&e.data.subscribeEmailToNewsletter;if(!s)throw new Error("Unable to subscribe to the newsletter.");return s};export{c as a,b,m as c,a as f,h as g,l as r,n as s};
//# sourceMappingURL=newsletter.js.map
