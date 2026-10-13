/*! Copyright 2026 Adobe
All Rights Reserved. */
import{FetchGraphQL as o}from"@dropins/tools/fetch-graphql.js";const{setEndpoint:c,setFetchGraphQlHeader:b,removeFetchGraphQlHeader:p,setFetchGraphQlHeaders:d,fetchGraphQl:r,getConfig:m}=new o().getMethods(),a=`
  mutation subscribeEmailToNewsletter($email: String!) {
    subscribeEmailToNewsletter(email: $email) {
      status
    }
  }
`,l=async t=>{const e=await r(a,{variables:{email:t}});if(e.errors)throw new Error(e.errors[0].message);const s=e.data&&e.data.subscribeEmailToNewsletter;if(!s)throw new Error("Unable to subscribe to the newsletter.");return s},i=`
  query customerNewsletterSubscription {
    customer {
      is_subscribed
    }
  }
`,w=async()=>{const t=await r(i);if(t.errors)throw new Error(t.errors[0].message);const e=t.data&&t.data.customer;if(!e)throw new Error("Unable to load the newsletter subscription.");return e.is_subscribed},n=`
  mutation updateNewsletterSubscription($input: CustomerUpdateInput!) {
    updateCustomerV2(input: $input) {
      customer {
        is_subscribed
      }
    }
  }
`,h=async t=>{const e=await r(n,{variables:{input:{is_subscribed:t}}});if(e.errors)throw new Error(e.errors[0].message);const s=e.data&&e.data.updateCustomerV2&&e.data.updateCustomerV2.customer;if(!s)throw new Error("Unable to update the newsletter subscription.");return s.is_subscribed};export{b as a,d as b,l as c,w as d,r as f,m as g,p as r,c as s,h as u};
//# sourceMappingURL=newsletter.js.map
