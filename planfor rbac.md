1-Buyer:
Can view Processing&Ordered items
Can change status from processing to Ordered&from Ordered to Shipped to WH(when changing to Shipped to WH a tracking number must be added)

2-China warehouse:
Can view Shipped to WH&Recieved to WH items
Can change status from Shipped to WH to Recieved in WH and from Recieved in WH to Shipped to LEB

3-Lebanon warehouse:
Can view Shipped to LEB&Recieved to LEB items
Can change status from Shipped to LEB to Recieved in LEB & from Recieved in LEB to Delivered to Customer

4-Super admin have full access and full edit for everything


Conclusion:
4 roles:Buyer,China warehouse,Lebanon warehouse,Super admin
7 status:processing,ordered,Shipped to WH,Recieved to WH,Shipped to LEB,Recieved in LEB,Delivered to Customer


-If item status is:Processing or Ordered or Shipped to WH or Recieved to WH,the customer will see it Processing.
-If the item status is:Shipped to LEB or Recieved in LEB,the customer will is Shipped
-if the item status is Delivered to Customer,the customer will see it Delivered
NOTE:if the order have more than one item,the order status will be changed when all the statuses of the items in the order are changed,and if the order have more than 1 item and the items have diffetent status,the order will take the status of the lowest level status between the itema